# AI Scheduler Test App

A minimal test application to validate the integration between the AI Scheduler and Vercel AI SDK adapter.

## Setup

1. Set your OpenAI API key:

   ```bash
   export OPENAI_API_KEY="your-api-key-here"
   ```

2. Run the test:
   ```bash
   pnpm start
   ```

## What it tests

- Creates a Vercel AI client using the adapter
- Defines test tools (getCurrentTime, calculateSum)
- Makes a real AI call to OpenAI's GPT-3.5 Turbo
- Validates the integration works end-to-end

The test will:

- ✅ Validate the adapter creates an AIClient properly
- ✅ Log tool availability (tools are logged but not executed yet)
- ✅ Make a real API call to OpenAI
- ✅ Return and display the AI response

This proves the adapter successfully bridges our scheduler's AIClient interface with Vercel's AI SDK.
