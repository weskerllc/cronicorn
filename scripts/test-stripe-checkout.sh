#!/bin/bash
# Stripe Checkout Flow Test Helper
#
# Prerequisites:
# 1. API server running: pnpm -F @cronicorn/api dev
# 2. Web app running: pnpm -F @cronicorn/web dev
# 3. Stripe webhook listener: stripe listen --forward-to localhost:3333/api/webhooks/stripe
# 4. Database running: docker compose up -d
#
# This script checks prerequisites and provides testing guidance.

set -e

API_URL="http://localhost:3333"
WEB_URL="http://localhost:5173"

echo "🧪 Stripe Subscription Flow Test Helper"
echo "========================================"
echo ""

# Step 1: Check API health
echo "1️⃣  Checking API server..."
if curl -s --connect-timeout 3 "$API_URL/api/health" > /dev/null 2>&1; then
    echo "   ✅ API server is running on port 3333"
else
    echo "   ❌ API server not responding"
    echo "   Start with: pnpm -F @cronicorn/api dev"
    exit 1
fi
echo ""

# Step 2: Check web app
echo "2️⃣  Checking web app..."
if curl -s --connect-timeout 3 "$WEB_URL" > /dev/null 2>&1; then
    echo "   ✅ Web app is running on port 5173"
else
    echo "   ⚠️  Web app not responding"
    echo "   Start with: pnpm -F @cronicorn/web dev"
fi
echo ""

# Step 3: Check database
echo "3️⃣  Checking database..."
if docker exec cronicorn-dev-db psql -U user -d db -c "SELECT 1;" > /dev/null 2>&1; then
    echo "   ✅ Database is accessible"
else
    echo "   ❌ Database not accessible"
    echo "   Start with: docker compose up -d"
    exit 1
fi
echo ""

# Step 4: Check environment variables
echo "4️⃣  Checking environment configuration..."
if [ -f .env ]; then
    if grep -q "STRIPE_SECRET_KEY=sk_test_" .env; then
        echo "   ✅ STRIPE_SECRET_KEY configured"
    else
        echo "   ⚠️  STRIPE_SECRET_KEY not set or invalid"
    fi
    
    if grep -q "STRIPE_WEBHOOK_SECRET=whsec_" .env; then
        echo "   ✅ STRIPE_WEBHOOK_SECRET configured"
    else
        echo "   ⚠️  STRIPE_WEBHOOK_SECRET not set"
        echo "   Get it from: stripe listen --forward-to localhost:3333/api/webhooks/stripe"
    fi
    
    if grep -q "STRIPE_PRICE_PRO=price_" .env; then
        echo "   ✅ STRIPE_PRICE_PRO configured"
    else
        echo "   ⚠️  STRIPE_PRICE_PRO not set"
        echo "   Run: pnpm tsx scripts/setup-stripe-products.ts"
    fi
    
    if grep -q "STRIPE_PRICE_ENTERPRISE=price_" .env; then
        echo "   ✅ STRIPE_PRICE_ENTERPRISE configured"
    else
        echo "   ⚠️  STRIPE_PRICE_ENTERPRISE not set"
        echo "   Run: pnpm tsx scripts/setup-stripe-products.ts"
    fi
else
    echo "   ❌ .env file not found"
    echo "   Copy from: cp .env.example .env"
    exit 1
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ All prerequisites met! Follow these steps:"
echo ""
echo "📋 Manual Testing (Recommended):"
echo ""
echo "  1. Open web app: $WEB_URL"
echo "  2. Sign in with GitHub OAuth"
echo "  3. Go to Pricing: $WEB_URL/pricing"
echo "  4. Click 'Subscribe to Pro' or 'Subscribe to Enterprise'"
echo "  5. Use test card: 4242 4242 4242 4242 (exp: 12/34, cvc: 123)"
echo "  6. Complete checkout"
echo "  7. Watch Stripe CLI terminal for webhook events (should see 200s)"
echo "  8. Verify tier update:"
echo ""
echo "     docker exec cronicorn-dev-db psql -U user -d db -c \\"
echo "       \"SELECT email, tier, subscription_status FROM \\\"user\\\";\""
echo ""
echo "  9. Test Customer Portal:"
echo "     - Go to Settings: $WEB_URL/settings"
echo "     - Click 'Manage Subscription'"
echo "     - Verify portal opens (if error, activate in Stripe Dashboard)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💳 Test Cards:"
echo ""
echo "  • Success:    4242 4242 4242 4242"
echo "  • Decline:    4000 0000 0000 0002"
echo "  • 3D Secure:  4000 0025 0000 3155"
echo ""
echo "  Expiry: Any future date (e.g., 12/34)"
echo "  CVC:    Any 3 digits (e.g., 123)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔍 Useful Commands:"
echo ""
echo "  # View all users and tiers"
echo "  docker exec cronicorn-dev-db psql -U user -d db -c \\"
echo "    \"SELECT email, tier, subscription_status, subscription_ends_at FROM \\\"user\\\";\""
echo ""
echo "  # View Stripe customers in Dashboard"
echo "  open https://dashboard.stripe.com/test/customers"
echo ""
echo "  # View Stripe subscriptions in Dashboard"
echo "  open https://dashboard.stripe.com/test/subscriptions"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
