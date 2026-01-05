# Stripe Setup & Testing Guide

Complete guide to set up and test Stripe subscriptions in your local development environment.

---

## Prerequisites

- Stripe account (free): https://dashboard.stripe.com/register
- Stripe CLI installed: https://stripe.com/docs/stripe-cli
- Docker running (for local database)
- GitHub OAuth configured (for authentication)

---

## Step 1: Get Stripe API Keys

1. **Log into Stripe Dashboard**: https://dashboard.stripe.com/test/apikeys
2. **Copy your test keys**:
   - Secret key (starts with `sk_test_...`)
   - Keep this key secure - it has full API access

3. **Add to .env file**:
   ```bash
   STRIPE_SECRET_KEY=sk_test_your_actual_key_here
   ```

---

## Step 2: Create Products & Prices

**Automated setup script** creates Pro and Enterprise products:

```bash
pnpm tsx scripts/setup-stripe-products.ts
```

The script will:
- ✅ Create Pro Plan ($29.99/month)
- ✅ Create Enterprise Plan ($99.99/month)
- ✅ Display price IDs
- ✅ Offer to auto-update your .env file

**What gets created:**

| Product | Price | Interval | Tier |
|---------|-------|----------|------|
| Pro Plan | $29.99 | Monthly | `pro` |
| Enterprise Plan | $99.99 | Monthly | `enterprise` |

**Manual alternative:** Create products in Stripe Dashboard at https://dashboard.stripe.com/test/products

---

## Step 3: Configure Webhooks

**For local development**, use Stripe CLI to forward webhooks:

```bash
stripe listen --forward-to localhost:3333/api/webhooks/stripe
```

**Copy the webhook signing secret** from the output:
```
Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
```

**Add to .env file**:
```bash
STRIPE_WEBHOOK_SECRET=whsec_your_actual_secret_here
```

**Keep this terminal running** - it will show webhook events in real-time.

**For production**, create a webhook endpoint in Stripe Dashboard:
- URL: `https://yourdomain.com/api/webhooks/stripe`
- Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`

---

## Step 4: Configure Customer Portal

**Required for subscription management** (cancel, update payment, etc.):

1. **Go to Customer Portal settings**: https://dashboard.stripe.com/test/settings/billing/portal
2. **Click "Activate test link"**
3. **Enable features**:
   - ✅ Update payment methods
   - ✅ Update billing information
   - ✅ View invoices
   - ✅ **Cancel subscriptions** (important!)
4. **Save configuration**

Without this, users will get an error when clicking "Manage Subscription".

---

## Step 5: Start Servers

**Start API server**:
```bash
pnpm -F @cronicorn/api dev
```

**Start web app** (in another terminal):
```bash
pnpm -F @cronicorn/web dev
```

**Keep Stripe CLI running** (webhook listener from Step 3).

---

## Step 6: Test Full Flow

### Manual Testing (Recommended)

1. **Open web app**: http://localhost:5173
2. **Sign in with GitHub**
3. **Go to Pricing page**: http://localhost:5173/pricing
4. **Click "Subscribe to Pro" or "Subscribe to Enterprise"**
5. **Use test card**: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., 12/34)
   - CVC: Any 3 digits (e.g., 123)
6. **Complete checkout**
7. **Watch webhook terminal** - you should see:
   ```
   checkout.session.completed → [200]
   customer.subscription.created → [200]
   invoice.payment_succeeded → [200]
   ```
8. **Verify in database**:
   ```bash
   docker exec cronicorn-dev-db psql -U user -d db -c \
     "SELECT email, tier, subscription_status FROM \"user\";"
   ```
   You should see tier updated to `pro` or `enterprise`.

### Test Customer Portal

1. **Go to Settings**: http://localhost:5173/settings
2. **Click "Manage Subscription"**
3. **Verify portal opens** with subscription details
4. **Test cancellation**:
   - Click "Cancel plan"
   - Confirm cancellation
   - Watch webhook terminal for `customer.subscription.updated`
   - Check database - `subscription_ends_at` should be set
   - Tier stays active until end of billing period

### Automated Test Script

For quick health checks:

```bash
bash scripts/test-stripe-checkout.sh
```

---

## Test Cards

| Scenario | Card Number | Expiry | CVC |
|----------|-------------|--------|-----|
| **Success** | `4242 4242 4242 4242` | Any future | Any 3 digits |
| **Decline** | `4000 0000 0000 0002` | Any future | Any 3 digits |
| **3D Secure** | `4000 0025 0000 3155` | Any future | Any 3 digits |
| **Insufficient funds** | `4000 0000 0000 9995` | Any future | Any 3 digits |

Full list: https://stripe.com/docs/testing

---

## Troubleshooting

### "STRIPE_SECRET_KEY not configured"
- Ensure you added your test key to `.env`
- Key must start with `sk_test_` for test mode
- Restart API server after updating .env

### "Invalid API key"
- Double-check you copied the entire key from Stripe Dashboard
- Ensure it's a **secret key**, not publishable key
- Secret keys start with `sk_test_`, publishable keys start with `pk_test_`

### Webhook signature verification failed
- Ensure `STRIPE_WEBHOOK_SECRET` in .env matches the CLI output
- Restart API server after updating .env
- Webhook secret starts with `whsec_`

### "No configuration provided" (Customer Portal error)
- You must activate Customer Portal in Stripe Dashboard
- Go to: https://dashboard.stripe.com/test/settings/billing/portal
- Click "Activate test link" and save settings

### Webhooks returning 400
- Check API server logs for detailed error messages
- Verify webhook secret matches between CLI and .env
- Ensure API server is running on port 3333

### Tier not updating after checkout
- Check webhook terminal - should see 200 responses
- Check API logs for any errors in webhook handlers
- Verify database migration ran: `subscription_status` column exists
- Run: `pnpm -F @cronicorn/migrator migrate`

---

## Environment Variables Summary

```bash
# Required for Stripe subscriptions
STRIPE_SECRET_KEY=sk_test_...          # From: https://dashboard.stripe.com/test/apikeys
STRIPE_WEBHOOK_SECRET=whsec_...        # From: stripe listen command output
STRIPE_PRICE_PRO=price_...             # From: setup script or Dashboard
STRIPE_PRICE_PRO_ANNUAL=price_...      # From: setup script or Dashboard
STRIPE_PRICE_ENTERPRISE=price_...      # From: setup script or Dashboard
BASE_URL=http://localhost:5173         # For redirect URLs
```

---

## Quick Reference

**View webhook events**: Watch Stripe CLI terminal

**Check user tier**:
```bash
docker exec cronicorn-dev-db psql -U user -d db -c \
  "SELECT email, tier, subscription_status FROM \"user\";"
```

**View subscription in Stripe Dashboard**:
- https://dashboard.stripe.com/test/subscriptions

**Test checkout URL**:
```bash
curl -X POST http://localhost:3333/api/subscriptions/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=YOUR_COOKIE" \
  -d '{"tier": "pro"}'
```

**Verify API health**:
```bash
curl http://localhost:3333/api/health
```
