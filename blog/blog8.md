Next - strictly enforcing code quality

This is a multi-parter consisting of tests, linting rules, and running these checks (both locally and in CI)

Lets start with tests.

We need to have a way to keep our AI in check. They love to subtly screw up.

First priority is testing our domain logic. As much as possible. 

(insert code snippet here vitest)

Priority Two: Application services - the integration points.

Happy paths, sad paths, and especially the boundaries between components

(insert code snippet here)

Priority Three: Adapter Contracts. The Trust Boundary.
Here's where it gets interesting for AI workflows. You don't need to test every adapter exhaustively. You need to test that adapters fulfill the contract.

(insert code snippet here)

The AI feedback loop: 

Here's the workflow I'd recommend:
Step One: Write Tests First. Always.
Before you ask the AI to write anything, write the tests. Be specific. Be exhaustive. Cover the edge cases.

Then you can instruct the ai to run these tests every time before a new feature is considered 'done'. This will also ensure you dont break existing logic as you go.


Next is going to be code quality in the case of linting. I like to be extra strict here. Regardless of what human / agents work on my project - I want to make sure it all is following the same very strict ruleset. not only on best practices (i.e. eslint typescript integration) - but also things like spacing etc.

For typescript projects, by far my favorite thing to use is eslint with antfu plugin.

Similar to tests - this must pass before the ai completes every task

Ai agents are good at following rules (i.e. adding to claude.md that they should run tests / lint before finishing)

But I would also recommend structurally putting this same test flow in CI (i.e. github actions / gitlab CI)