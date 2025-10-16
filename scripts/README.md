# Stripe Setup Scripts

## setup-stripe-products.ts

Automated script to create Pro and Enterprise subscription products in Stripe.

### Quick Start

1. **Get your Stripe test API key**:
   - Visit https://dashboard.stripe.com/test/apikeys
   - Click "Create secret key" or use existing test key
   - Copy the key (starts with `sk_test_...`)

2. **Add key to .env**:
   ```bash
   # In /Users/bcanfield/Documents/Git/mvpmvp/.env
   STRIPE_SECRET_KEY=sk_test_your_actual_key_here
   ```

3. **Run the setup script**:
   ```bash
   pnpm tsx scripts/setup-stripe-products.ts
   ```

4. **Follow prompts**:
   - Script will create Pro ($29.99/month) and Enterprise ($99.99/month) products
   - Price IDs will be displayed
   - Choose "y" to automatically update your .env file

### What It Creates

| Product | Price | Interval | Tier |
|---------|-------|----------|------|
| Pro Plan | $29.99 | Monthly | pro |
| Enterprise Plan | $99.99 | Monthly | enterprise |

### After Setup

1. **Get webhook secret** (for local testing):
   ```bash
   stripe listen --forward-to localhost:3333/api/webhooks/stripe
   ```
   Copy the webhook secret (`whsec_...`) to your .env as `STRIPE_WEBHOOK_SECRET`

2. **Start your API**:
   ```bash
   pnpm -F @cronicorn/api dev
   ```

3. **Test checkout**:
   ```bash
   curl -X POST http://localhost:3333/api/subscriptions/checkout \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer your_token" \
     -d '{"tier": "pro"}'
   ```

### Troubleshooting

**Error: "STRIPE_SECRET_KEY not configured"**
- Make sure you added your test key to `.env`
- Key should start with `sk_test_` for test mode

**Error: "Invalid API key"**
- Double-check you copied the full key from Stripe Dashboard
- Make sure it's a secret key (not publishable key)

**Products already exist?**
- Script will create new products each time
- To reuse existing products, find their price IDs in Dashboard and add manually to .env
