#!/usr/bin/env tsx
/* eslint-disable no-console */
/**
 * Stripe Product Setup Script
 *
 * This script creates Pro and Enterprise subscription products in Stripe
 * and outputs the price IDs needed for .env configuration.
 *
 * Prerequisites:
 * 1. Set STRIPE_SECRET_KEY in .env (get from https://dashboard.stripe.com/test/apikeys)
 *
 * Usage:
 *   pnpm tsx scripts/setup-stripe-products.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import Stripe from "stripe";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env file
function loadEnv(): Record<string, string> {
  const envPath = path.join(__dirname, "../.env");
  if (!fs.existsSync(envPath)) {
    console.error("❌ .env file not found. Please create one from .env.example");
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, "utf-8");
  const env: Record<string, string> = {};

  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#"))
      continue;

    const [key, ...valueParts] = trimmed.split("=");
    if (key && valueParts.length > 0) {
      env[key.trim()] = valueParts.join("=").trim();
    }
  }

  return env;
}

async function main() {
  console.log("🚀 Stripe Product Setup\n");

  // Load environment variables
  const env = loadEnv();
  const secretKey = env.STRIPE_SECRET_KEY;

  if (!secretKey || secretKey === "sk_test_your_stripe_secret_key_here") {
    console.error("❌ STRIPE_SECRET_KEY not configured in .env");
    console.error("   Get your test key from: https://dashboard.stripe.com/test/apikeys");
    console.error("   Add it to .env file as: STRIPE_SECRET_KEY=sk_test_...");
    process.exit(1);
  }

  if (!secretKey.startsWith("sk_test_")) {
    console.error("⚠️  Warning: Not using test key! Use sk_test_... for development.");
    const readline = await import("node:readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    await new Promise<void>((resolve) => {
      rl.question("Continue anyway? (y/N): ", (answer) => {
        rl.close();
        if (answer.toLowerCase() !== "y") {
          console.log("Aborted.");
          process.exit(0);
        }
        resolve();
      });
    });
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: "2023-10-16",
  });

  console.log("✅ Connected to Stripe API\n");

  try {
    // Create Pro Product
    console.log("📦 Creating Pro product...");
    const proProduct = await stripe.products.create({
      name: "Pro Plan",
      description: "Professional tier with advanced features",
      metadata: {
        tier: "pro",
      },
    });
    console.log(`   ✓ Product created: ${proProduct.id}`);

    // Create Pro Price (monthly)
    console.log("💰 Creating Pro monthly price ($29.99)...");
    const proPrice = await stripe.prices.create({
      product: proProduct.id,
      currency: "usd",
      unit_amount: 2999, // $29.99 in cents
      recurring: {
        interval: "month",
      },
      metadata: {
        tier: "pro",
      },
    });
    console.log(`   ✓ Price created: ${proPrice.id}\n`);

    // Create Enterprise Product
    console.log("📦 Creating Enterprise product...");
    const enterpriseProduct = await stripe.products.create({
      name: "Enterprise Plan",
      description: "Enterprise tier with premium features and support",
      metadata: {
        tier: "enterprise",
      },
    });
    console.log(`   ✓ Product created: ${enterpriseProduct.id}`);

    // Create Enterprise Price (monthly)
    console.log("💰 Creating Enterprise monthly price ($99.99)...");
    const enterprisePrice = await stripe.prices.create({
      product: enterpriseProduct.id,
      currency: "usd",
      unit_amount: 9999, // $99.99 in cents
      recurring: {
        interval: "month",
      },
      metadata: {
        tier: "enterprise",
      },
    });
    console.log(`   ✓ Price created: ${enterprisePrice.id}\n`);

    // Display results
    console.log("=".repeat(60));
    console.log("✅ Setup complete! Add these to your .env file:\n");
    console.log(`STRIPE_PRICE_PRO=${proPrice.id}`);
    console.log(`STRIPE_PRICE_ENTERPRISE=${enterprisePrice.id}`);
    console.log("=".repeat(60));

    console.log("\n📝 Next steps:");
    console.log("1. Copy the price IDs above to your .env file");
    console.log("2. Get webhook secret by running: stripe listen --forward-to localhost:3333/api/webhooks/stripe");
    console.log("3. Add STRIPE_WEBHOOK_SECRET to .env");
    console.log("4. Start your API server: pnpm -F @cronicorn/api dev");
    console.log("5. Test checkout: POST http://localhost:3333/api/subscriptions/checkout\n");

    // Offer to update .env automatically
    if (process.stdout.isTTY) {
      const readline = await import("node:readline");
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      await new Promise<void>((resolve) => {
        rl.question("Would you like to update .env automatically? (y/N): ", (answer) => {
          rl.close();
          if (answer.toLowerCase() === "y") {
            updateEnvFile(proPrice.id, enterprisePrice.id);
          }
          resolve();
        });
      });
    }
  }
  catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const type = error && typeof error === "object" && "type" in error ? error.type : undefined;
    console.error("\n❌ Error:", message);
    if (type === "StripeAuthenticationError") {
      console.error("   Invalid API key. Check your STRIPE_SECRET_KEY in .env");
    }
    process.exit(1);
  }
}

function updateEnvFile(proPriceId: string, enterprisePriceId: string) {
  const envPath = path.join(__dirname, "../.env");
  let envContent = fs.readFileSync(envPath, "utf-8");

  // Update or add STRIPE_PRICE_PRO
  if (envContent.includes("STRIPE_PRICE_PRO=")) {
    envContent = envContent.replace(
      /STRIPE_PRICE_PRO=.*/,
      `STRIPE_PRICE_PRO=${proPriceId}`,
    );
  }
  else {
    envContent += `\nSTRIPE_PRICE_PRO=${proPriceId}`;
  }

  // Update or add STRIPE_PRICE_ENTERPRISE
  if (envContent.includes("STRIPE_PRICE_ENTERPRISE=")) {
    envContent = envContent.replace(
      /STRIPE_PRICE_ENTERPRISE=.*/,
      `STRIPE_PRICE_ENTERPRISE=${enterprisePriceId}`,
    );
  }
  else {
    envContent += `\nSTRIPE_PRICE_ENTERPRISE=${enterprisePriceId}`;
  }

  fs.writeFileSync(envPath, envContent);
  console.log("\n✅ .env file updated!");
}

main().catch(console.error);
