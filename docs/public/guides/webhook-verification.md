---
title: Webhook Verification
description: How to verify that incoming requests are genuinely from Cronicorn
tags:
  - user
  - security
  - webhooks
sidebar_position: 1
mcp:
  uri: "cronicorn://guides/webhook-verification"
  mimeType: text/markdown
  priority: 0.85
  lastModified: 2026-02-11T00:00:00Z
---

# Webhook Verification

Every outbound request from Cronicorn includes HMAC-SHA256 signature headers that let your endpoints verify the request is genuine.

## How It Works

Each request includes two headers:

| Header | Example | Description |
|--------|---------|-------------|
| `X-Cronicorn-Signature` | `sha256=a1b2c3...` | HMAC-SHA256 of `"{timestamp}.{body}"` |
| `X-Cronicorn-Timestamp` | `1700000000` | Unix timestamp (seconds) when the request was signed |

The signature is computed as:

```
HMAC-SHA256(your_signing_key, "{timestamp}.{body}")
```

Where `body` is the raw request body string (empty string for GET/HEAD requests).

## Getting Your Signing Key

Your signing key is automatically created when your account is set up. You can view, create, or rotate it via:

- **API**: `GET /api/signing-keys`, `POST /api/signing-keys`, `POST /api/signing-keys/rotate`
- **MCP**: `getSigningKey`, `createSigningKey`, `rotateSigningKey` tools

The raw key is only shown once when created or rotated. Store it securely.

## Verification Examples

### Node.js

```javascript
import crypto from 'node:crypto';

function verifySignature(req, signingKey) {
  const signature = req.headers['x-cronicorn-signature'];
  const timestamp = req.headers['x-cronicorn-timestamp'];

  if (!signature || !timestamp) return false;

  // Replay protection: reject requests older than 5 minutes
  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp);
  if (age > 300) return false;

  // Compute expected signature
  const body = req.body ? JSON.stringify(req.body) : '';
  const payload = `${timestamp}.${body}`;
  const expected = crypto.createHmac('sha256', signingKey)
    .update(payload)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  const actual = signature.replace('sha256=', '');
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(actual)
  );
}
```

### Python

```python
import hmac
import hashlib
import time

def verify_signature(headers, body, signing_key):
    signature = headers.get('X-Cronicorn-Signature', '')
    timestamp = headers.get('X-Cronicorn-Timestamp', '')

    if not signature or not timestamp:
        return False

    # Replay protection: reject requests older than 5 minutes
    age = int(time.time()) - int(timestamp)
    if age > 300:
        return False

    # Compute expected signature
    payload = f"{timestamp}.{body}"
    expected = hmac.new(
        signing_key.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()

    # Constant-time comparison
    actual = signature.replace('sha256=', '')
    return hmac.compare_digest(expected, actual)
```

### Go

```go
package main

import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "fmt"
    "net/http"
    "strconv"
    "strings"
    "time"
)

func verifySignature(r *http.Request, body []byte, signingKey string) bool {
    signature := r.Header.Get("X-Cronicorn-Signature")
    timestamp := r.Header.Get("X-Cronicorn-Timestamp")

    if signature == "" || timestamp == "" {
        return false
    }

    // Replay protection
    ts, err := strconv.ParseInt(timestamp, 10, 64)
    if err != nil {
        return false
    }
    if time.Now().Unix()-ts > 300 {
        return false
    }

    // Compute expected signature
    payload := fmt.Sprintf("%s.%s", timestamp, string(body))
    mac := hmac.New(sha256.New, []byte(signingKey))
    mac.Write([]byte(payload))
    expected := hex.EncodeToString(mac.Sum(nil))

    actual := strings.TrimPrefix(signature, "sha256=")
    return hmac.Equal([]byte(expected), []byte(actual))
}
```

## Replay Protection

The `X-Cronicorn-Timestamp` header enables replay protection. Reject requests where the timestamp is older than your tolerance window (5 minutes recommended):

```javascript
const age = Math.floor(Date.now() / 1000) - parseInt(timestamp);
if (age > 300) {
  // Request is too old — possible replay attack
  return res.status(401).send('Request expired');
}
```

## Key Rotation

When you rotate your signing key:

1. The old key is **immediately invalidated**
2. All subsequent requests use the new key
3. Any in-flight requests signed with the old key will fail verification

Plan rotation during low-traffic periods to minimize verification failures.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Signature mismatch | Body was modified (e.g., by middleware) | Verify against raw body before parsing |
| All signatures fail | Wrong signing key | Check `GET /api/signing-keys` for key prefix |
| Intermittent failures | Clock skew | Increase timestamp tolerance window |
| No signature headers | No signing key configured | Create one via `POST /api/signing-keys` |
