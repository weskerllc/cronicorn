#!/bin/bash
# Test Stripe Checkout Flow
#
# Prerequisites:
# 1. API server running (pnpm -F @cronicorn/api dev)
# 2. Stripe webhook listener running (stripe listen --forward-to localhost:3333/api/webhooks/stripe)
# 3. Logged in user with valid session

set -e

API_URL="http://localhost:3333"

echo "🧪 Testing Stripe Subscription Flow"
echo "===================================="
echo ""

# Step 1: Check API health
echo "1️⃣  Checking API health..."
HEALTH=$(curl -s "$API_URL/api/health")
if [ -z "$HEALTH" ]; then
    echo "❌ API server not responding. Make sure it's running:"
    echo "   pnpm -F @cronicorn/api dev"
    exit 1
fi
echo "✅ API server is running"
echo ""

# Step 2: Test checkout endpoint (will need auth)
echo "2️⃣  Testing checkout endpoint..."
echo ""
echo "To test checkout, you need to be logged in. Here are two options:"
echo ""
echo "Option A: Use the web app"
echo "  1. Open http://localhost:5173 in your browser"
echo "  2. Log in with GitHub OAuth"
echo "  3. Open browser DevTools → Network tab"
echo "  4. Make a request to /api/subscriptions/checkout"
echo "  5. Copy the checkout URL from the response"
echo ""
echo "Option B: Create a test API key"
echo "  1. Log in to web app: http://localhost:5173"
echo "  2. Go to Settings (once implemented)"
echo "  3. Generate API key"
echo "  4. Use with: curl -H \"x-api-key: your_key\" ..."
echo ""
echo "Quick manual test with curl (replace YOUR_SESSION_COOKIE):"
echo ""
echo "curl -X POST '$API_URL/api/subscriptions/checkout' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'Cookie: better-auth.session_token=YOUR_SESSION_COOKIE' \\"
echo "  -d '{\"tier\": \"pro\"}' \\"
echo "  | jq"
echo ""

# Step 3: Show test card info
echo "3️⃣  Stripe test card numbers:"
echo "  • Success: 4242 4242 4242 4242"
echo "  • Decline: 4000 0000 0000 0002"
echo "  • 3D Secure: 4000 0025 0000 3155"
echo "  • Any future expiry date (e.g., 12/34)"
echo "  • Any 3-digit CVC"
echo ""

echo "4️⃣  Watch webhook events in the Stripe CLI terminal"
echo "  You should see: checkout.session.completed → [200]"
echo ""

echo "5️⃣  Verify tier update in database:"
echo "  docker exec cronicorn-dev-db psql -U user -d db -c \"SELECT id, email, tier, stripe_customer_id FROM \\\"user\\\" LIMIT 5;\""
echo ""
