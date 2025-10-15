#!/usr/bin/env node
/* eslint-disable ts/no-explicit-any */
/* eslint-disable node/no-process-env */
/* eslint-disable no-console */

// Minimal test app to validate AI scheduler + Vercel AI SDK integration
// Usage: OPENAI_API_KEY=your_key pnpm start

import { openai } from "@ai-sdk/openai";
import { createVercelAiClient } from "@cronicorn/adapter-ai";
import { defineTools, tool } from "@cronicorn/domain";
import { z } from "zod";

async function main() {
  console.log("🚀 Testing AI Scheduler + Vercel AI SDK Integration");

  // Check for API key
  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ Please set OPENAI_API_KEY environment variable");
    process.exit(1);
  }

  // Create the AI client using our adapter
  const aiClient = createVercelAiClient({
    model: openai("gpt-3.5-turbo"),
    maxOutputTokens: 500,
    temperature: 0.7,
    logger: {
      info: (msg: string, meta?: any) => console.log(`ℹ️  ${msg}`, meta || ""),
      warn: (msg: string, meta?: any) => console.warn(`⚠️  ${msg}`, meta || ""),
      error: (msg: string, meta?: any) => console.error(`❌ ${msg}`, meta || ""),
    },
  });

  // Define some test tools with Zod schemas
  const tools = defineTools({
    tellJoke: tool({
      description: "When user asks you to tell a joke, you must call this tool.",
      schema: z.object({}), // No parameters needed
      execute: async () => {
        return "Why do programmers prefer dark mode? Because light attracts bugs! 🐛";
      },
    }),
    calculateSum: tool({
      description: "Calculate the sum of two numbers",
      schema: z.object({
        a: z.number().describe("First number"),
        b: z.number().describe("Second number"),
      }),
      execute: async (args) => {
        // args is now properly typed as { a: number; b: number } thanks to schema inference!
        return `The sum of ${args.a} and ${args.b} is ${args.a + args.b}`;
      },
    }),
  });

  try {
    console.log("\\n📝 Testing basic AI generation...");

    const result = await aiClient.planWithTools({
      input: "Hello! Please tell me a short joke about programming.",
      tools,
      maxTokens: 200,
    });

    console.log("\\n✅ AI Response:");
    console.log(result.text);

    if (result.usage) {
      console.log("\\n📊 Usage:");
      console.log(`  Prompt tokens: ${result.usage.promptTokens}`);
      console.log(`  Completion tokens: ${result.usage.completionTokens}`);
    }
  }
  catch (error) {
    console.error("\\n❌ Error:", error);
    process.exit(1);
  }

  console.log("\\n🎉 Test completed successfully!");
}

// Run the test
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
