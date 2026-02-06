This is my first — and maybe last — blog post.

I’ve avoided writing one for years because I never felt like an expert. There’s always someone smarter, deeper, already writing about the same thing. Usually better than I could.

That’s still true.

I’m not an AI expert. I’m not the cleanest developer either.

What I am is a senior software engineer with 8+ years of experience. Enough scars to recognize when something’s going wrong. Not enough ego to pretend I’ve got it all figured out.

So why write this?

Because AI has been my main side obsession for the last two or three years. I’ve watched it go from a clumsy helper to something that can generate serious amounts of code. And I’ve spent hundreds — probably thousands — of hours building with it. Not demos. Real projects. Stuff with consequences.

A lot of those early projects failed.

I over-prompted. I over-generated. I let the codebase grow faster than my understanding. At some point, I wasn’t driving anymore. The project became fragile, exhausting, and hard to reason about. Hours disappeared. Sometimes days. Starting over felt easier than fixing what I had.

That kind of failure sticks with you.

Not just because of the wasted time, but because you start wondering whether you’re actually improving — or just burning attention.

After enough of those failures, patterns started to emerge. Rules. Ways of working where AI stays useful without taking control. None of these came from theory or research. They came from doing it wrong, over and over, until the shape of “right” became obvious.

That’s what this post is about.

If it helps you avoid even a fraction of the mistakes I made, it’s worth writing.

Let’s get into it.

---------------------------------------


## Rule #1: Enforce Clean Architecture or Don’t Bother

The most important rule I’ve learned is this:
**if you don’t enforce a clean architecture early, AI will happily destroy your project for you.**

After a lot of experimentation, I’ve landed on **hexagonal architecture** as the most reliable option.

I used to think it was overkill. Too much boilerplate. Too many files. I was firmly in the “less code is better” camp, and at the time, that wasn’t totally wrong.

What changed is scale — not team size, but *output*. AI can generate code faster than you can reason about it. That flips the problem. The bottleneck isn’t typing anymore. It’s **understanding**.

So now I optimize for one thing above almost everything else:
**clear, enforced boundaries.**

---

## ALWAYS Start With the Domain.

When I start a new app, I want the domain to be stupid clean.

No frameworks.
No database.
No HTTP.
No imports I’ll regret later.

Just LOGIC.

The domain should define:

* What goes *in*
* What comes *out*
* And the rules in between

That’s it.

If you can’t explain what your application does without mentioning Postgres, Kafka, or Docker, you don’t understand it yet.

This has real benefits:

* You can test everything without spinning up infrastructure
* You can read the code and actually understand the behavior
* AI has less surface area to hallucinate garbage

And most importantly: you’re forced to answer the hard questions early.

---

## What *Not* to Do

What you don’t want to do is this:

Fire up the terminal.
Install seventeen packages.
Spin up Postgres.
<<I dont like this line>>
Add Redis because someone on Hacker News said it was “basically free performance.”

And still not have a single line of code that actually *does* anything.

That’s backwards.

<<I dont like this line>>
That’s like buying a $400 Japanese knife before you know how to hold an onion.

<<This is maybe duplicate - we already kind of said this>>
Forget the database.
Forget the framework.
Forget Docker.

<<We're repeating. This section could be more concise and punchy>>
Start with the domain.

What is this thing?
What are the nouns?
What are the verbs?
What must always be true?

This is a perfect moment to use AI — not to write code, but to **think clearly**.

---

## Phase One: Let AI Help You Shape the Domain

This is one of the few prompts I actually reuse.

**Sample prompt:**

> I’m building a system that does **X**.
> Ignore frameworks, databases, and infrastructure.
>
> Identify:
>
<<Give examples here. but just keep the code snippets minimal and understandable>>
> * Core domain entities
> * Value objects
<<Idk what an invaraint is. make this in simpler language>>
> * Domain rules / invariants
> * Inputs and outputs
>
> Respond using plain TypeScript interfaces and pure functions. No side effects.

You’re not asking AI to *build* anything yet. You’re asking it to help you name things correctly. That alone saves hours.

**Example domain sketch:**

```ts
// domain/order.ts

export type OrderId = string;

export interface Order {
  id: OrderId;
  items: OrderItem[];
  status: "pending" | "confirmed" | "cancelled";
}

export interface OrderItem {
  sku: string;
  quantity: number;
}

export function confirmOrder(order: Order): Order {
  if (order.items.length === 0) {
    throw new Error("Cannot confirm empty order");
  }

  return { ...order, status: "confirmed" };
}
```

<<dont like this line>>
No IO. No magic. Just rules.

---

## Phase Two: Ports — What the Domain Needs

Now you ask a different question:

**What does my domain need from the outside world?**

Not *how* it gets it. Just *what*.
<<give more relatable examples>>
Persistence.
Time.
IDs.
Notifications.

These become **ports** — contracts, not implementations.

```ts
// ports/order-repository.ts

import { Order, OrderId } from "../domain/order";

export interface OrderRepository {
  findById(id: OrderId): Promise<Order | null>;
  save(order: Order): Promise<void>;
}
```

Notice what’s missing:

* No SQL
* No ORM
* No database client

This is deliberate. You’re keeping options open.

---

<<this needs to be explained in a more dumbed down way>>

## Phase Three: Application Layer (The Recipes)

This is where things get assembled.

The application layer doesn’t contain business rules — it **orchestrates** them. Think of it as a recipe, not a chef.

```ts
// application/confirm-order.ts

import { OrderRepository } from "../ports/order-repository";
import { confirmOrder } from "../domain/order";

export async function confirmOrderUseCase(
  repo: OrderRepository,
  orderId: string
) {
  const order = await repo.findById(orderId);

  if (!order) {
    throw new Error("Order not found");
  }

  const confirmed = confirmOrder(order);
  await repo.save(confirmed);
}
```

Still no database. Still no framework.
But now you can *do* something.

---

## Phase Four: Adapters (Start Stupid on Purpose)

Now you finally write implementations.

I recommend starting with the simplest possible adapter.
Not Postgres. Not Prisma. Not migrations.

An in-memory adapter.

```ts
// adapters/in-memory-order-repo.ts

import { OrderRepository } from "../ports/order-repository";
import { Order } from "../domain/order";

export class InMemoryOrderRepository implements OrderRepository {
  private store = new Map<string, Order>();

  async findById(id: string) {
    return this.store.get(id) ?? null;
  }

  async save(order: Order) {
    this.store.set(order.id, order);
  }
}
```

This lets you:

* Run the app immediately
* Iterate fast
* Avoid infrastructure drag
* Let AI refactor safely without breaking production data

This step alone has saved me *days*.

---

## Phase Five: Wire It Up and Prove It Works

This is your **composition root** — the only place things are allowed to touch.

```ts
// main.ts

import { InMemoryOrderRepository } from "./adapters/in-memory-order-repo";
import { confirmOrderUseCase } from "./application/confirm-order";

const repo = new InMemoryOrderRepository();

await confirmOrderUseCase(repo, "order-123");
```

Before you even think about a real database, stop here and validate:

* Write unit tests against the **domain**
* Write tests for the **application layer** using the in-memory adapter
* Throw weird inputs at it
* Break it on purpose

If something feels unclear now, adding Postgres will not fix it. It will only bury the problem.

---

## Phase Six: Now — And Only Now — The Database

You’ve validated the logic.
You know what needs to be stored.
You know the queries you actually need.

Now you bring in the heavy machinery.

This is a commitment. It slows things down. Migrations, schemas, environments, credentials. Don’t underestimate that cost.

But now it’s worth paying — because the system already works.

---

## Phase Seven: Wire for Production

Swap the adapter.
Nothing else changes.

That’s the whole point.

---

## Why This Matters More in the AI Era

Before AI, small teams often skipped this because it took too long.

That excuse is gone.

AI can generate the scaffolding.
You provide the discipline.

This is how you move fast **without** losing control.
This is how you build something that survives its own success.

---

## Next: ADRs (Architectural Decision Records)

The second rule is simple: **write things down or expect chaos later.**

I keep a `.adr/` folder at the root of every repo.

Any *meaningful* architectural decision requires a new markdown file. No exceptions. Short, complete, and written while the decision is still fresh — not three weeks later when everyone remembers it differently.

Each ADR answers:

* What decision was made
* Why it was made
* What alternatives were considered
* What tradeoffs were accepted

That’s it. No fluff.

Files are named with a numeric prefix so they’re ordered:

```
001-use-hexagonal-architecture.md
002-in-memory-adapter-first.md
003-postgres-over-mongodb.md
```

This matters for two reasons.

First, **future you**. You can scan the ADRs and immediately see how the system got here, in order, without archaeology.

Second — and this is new — **AI agents**.

I explicitly tell agents to read and respect the ADRs. When they suggest changes that violate them, I stop them. When they generate code, I expect it to align with the documented decisions. This alone cuts down on a shocking amount of nonsense.

ADRs become guardrails.

---

## When Is a Decision “Big Enough” for an ADR?

Short answer: earlier than you think.

If you’re asking yourself *“should this be an ADR?”* — the answer is almost always yes.

I strongly prefer **too many ADRs over too few**. Writing one takes minutes. Not writing one costs hours later when:

* AI reintroduces something you already rejected
* You forget why a choice was made
* The architecture quietly drifts

An ADR doesn’t mean the decision is permanent. It just means it was *intentional*.

And intentional systems age better — especially when AI is writing half the code.

---

## Next: Enforce Code Quality Ruthlessly

This part isn’t optional. This is how you keep AI from quietly wrecking your codebase while smiling about it.

For me, this breaks into three things:

* Tests
* Linting
* Enforcement (locally *and* in CI)

If any one of these is missing, the whole system leaks.

---

<<for this testing section lets ensure its concise and punchy. alot of people will eye roll when it comes to tests. lets just get the point across that the most imporatnt part is keeping the domain tested, and a few crucial other tests>>


## Tests: Your Primary Control Mechanism

AI is fast. It’s also very good at subtly breaking things. Off-by-one errors. Slightly changed behavior. “Looks right” bugs.

Tests are how you keep it honest.

### Priority One: Domain Logic

The domain is sacred. Test it heavily.

No mocks.
No IO.
No excuses.

If the rules live here, they get locked down.

**Vitest example:**

```ts
import { describe, it, expect } from "vitest";
import { confirmOrder } from "./order";

describe("confirmOrder", () => {
  it("confirms a valid order", () => {
    const order = {
      id: "1",
      items: [{ sku: "abc", quantity: 1 }],
      status: "pending",
    };

    const result = confirmOrder(order);

    expect(result.status).toBe("confirmed");
  });

  it("throws on empty orders", () => {
    const order = {
      id: "1",
      items: [],
      status: "pending",
    };

    expect(() => confirmOrder(order)).toThrow();
  });
});
```

This stuff should be boring. Predictable. Locked.

If AI breaks a domain test, that’s a hard stop.

---

### Priority Two: Application Services (Integration Points)

This is where things start touching each other. Repositories. Use cases. Orchestration.

Here you test:

* Happy paths
* Sad paths
* Boundary conditions between components

Use real implementations where possible. In-memory adapters are perfect for this.

```ts
import { describe, it, expect } from "vitest";
import { confirmOrderUseCase } from "./confirm-order";
import { InMemoryOrderRepository } from "../adapters/in-memory-order-repo";

describe("confirmOrderUseCase", () => {
  it("confirms an existing order", async () => {
    const repo = new InMemoryOrderRepository();

    await repo.save({
      id: "1",
      items: [{ sku: "abc", quantity: 1 }],
      status: "pending",
    });

    await confirmOrderUseCase(repo, "1");

    const updated = await repo.findById("1");
    expect(updated?.status).toBe("confirmed");
  });

  it("fails when order does not exist", async () => {
    const repo = new InMemoryOrderRepository();

    await expect(
      confirmOrderUseCase(repo, "missing")
    ).rejects.toThrow();
  });
});
```

This catches most “AI made a reasonable assumption” bugs before they escape.

---

### Priority Three: Adapter Contracts — The Trust Boundary

This is the part most people miss.

<<this needs to be explained in a more dumbed down way>>
You do *not* need to exhaustively test every adapter. You need to test that **each adapter fulfills the port contract**.

Same tests. Different implementations.

```ts
export function orderRepositoryContract(
  createRepo: () => OrderRepository
) {
  it("can save and retrieve an order", async () => {
    const repo = createRepo();

    const order = {
      id: "1",
      items: [{ sku: "abc", quantity: 1 }],
      status: "pending",
    };

    await repo.save(order);
    const loaded = await repo.findById("1");

    expect(loaded).toEqual(order);
  });
}
```

Then reuse it:

```ts
import { describe } from "vitest";
import { orderRepositoryContract } from "./order-repo.contract";
import { InMemoryOrderRepository } from "../adapters/in-memory-order-repo";

describe("InMemoryOrderRepository", () => {
  orderRepositoryContract(() => new InMemoryOrderRepository());
});
```
<<how?>>
When you later add Postgres, you run the *same contract tests*.
If it passes, you trust it. If not, it doesn’t ship.

This is gold for AI workflows. You give it a contract, and you don’t argue with the output.

---

## The AI Feedback Loop

This is the workflow I recommend. No shortcuts.

**Step one: write tests first. Always.**
<<i have never done this - i have the ai think of what the functionality should do, implement , THEN write the test , then ensure it passes. if it fails, most likely the logic needs tweaked>>

Before you ask AI to implement anything, you write the tests:

* Be explicit
* Cover edge cases
* Encode the behavior you actually want

Then you tell the AI two rules:

1. Run tests before marking a task “done”
2. Don’t break existing tests — ever

That alone prevents 80% of regressions.

---

<<doing this from the start of a project ensures you never get buried with lint errors. Quality is established from the start>>
## Linting: Make Style Non-Negotiable

Tests protect behavior. Linting protects sanity.

I’m strict here on purpose. I don’t want to debate formatting, imports, or “personal style” — especially with AI in the mix.

For TypeScript projects, my go-to is **ESLint with the antfu config**. It enforces:

* Consistent formatting
* Sensible defaults
* Modern TypeScript best practices

No bikeshedding. One ruleset. Everyone follows it — humans and agents alike.

Same rule as tests:
**lint must pass before a task is considered complete.**

AI is actually very good at following lint rules *if you make them real*.

---

<<this is especially important on multi-person teams - or teams where agents are pushing pull requests - so that the pull request workflow can show if the quality passed or failed>>
## Enforce It Locally *and* in CI

Telling AI to run tests and lint is good.

Making it impossible to merge without them is better.

Put the same checks in CI:

* Run tests
* Run lint
* Fail fast

GitHub Actions. GitLab CI. Whatever you use — doesn’t matter.

What matters is that the rules aren’t suggestions.

---

## Other Tips That Actually Matter

<<this is especially important on multi-person teams - or teams where agents are pushing pull requests - so that the pull request workflow can show if the quality passed or failed>>

Other things that I havent mentioned yet but determine if AI helps you or slowly derails you.

### Be Explicit With Your Agent Config

<<keep these concise, and reference other files such as docs / etc. this goes back to the issue of having multiple areas to maintain with similar content. i.e. if you have an architecture doc in your CONTRIBUTING.md and your docs site , do you want to duplicate it here? no. maybe link to the doc or something>>
Your agent config files (`claude.md`, `copilot-instructions.md`, etc.) are not decoration. They’re part of the system.

I always include rules like:

* Favor simplicity and readability over cleverness
* Do not over-engineer
* Do not add features that were not explicitly requested
* Do not reinvent existing abstractions
* ALways use up to date docs for libraries
* Stay on task

This sounds obvious. It isn’t.

Left alone, AI tends to chase “complete” instead of “correct.” These rules pull it back toward boring, understandable code.

### Force Fresh Docs for Library Work

Any time AI touches an external library, framework, or API, I require it to consult up-to-date documentation. That means tools like Context7 or web search — not training-data memory.

This avoids a whole class of bugs where the code *looks* right but relies on APIs that changed six months ago.

If the agent can’t cite the docs, I don’t trust the code.

### Comments Are Fine. Just Keep Them Short.

I’m not anti-comments. I’m anti-essays.

<<concise is my favorite word - with everything . docs, comments, code, you name it. ai likes to be wordy>>
When I want comments, I say one word: **concise**.

Good comments explain *why something exists*, not *what the code already says*. AI is especially bad at over-commenting. You have to rein that in early or you’ll end up with noise instead of clarity.

This could honestly be its own rule.

---

## Common Failure Modes (And How to Stop Them)

These are patterns I’ve seen repeatedly. If you’re using AI seriously, you’ll recognize them.

### AI Rewrites What Already Exists

This one’s subtle and dangerous.

AI will happily reimplement logic that already exists elsewhere in your codebase — sometimes identical, sometimes slightly different. Either way, you now have two sources of truth.

When this happens, it usually means one of two things:

* The agent isn’t being instructed to search for existing code
* Your codebase doesn’t make it obvious *where* that logic lives

Fixes:

* Tell the agent to search for existing implementations before writing new ones
* Strengthen boundaries and naming so reuse is obvious
* Document key entry points in ADRs or agent instructions

Duplication is rarely an AI problem. It’s a signaling problem.

---

### AI Adds “Helpful” Extra Features

AI loves bells and whistles. Pagination you didn’t ask for. Retry logic you didn’t need. Optional configs nobody will use.

That’s scope creep, just faster.

One solution that works surprisingly well:
**tell the AI to write things down instead of implementing them.**

If it notices:

* A security concern
* A performance improvement
* A future feature

Have it log the idea in:
<<these tips need to be brought earlier in the doc i think. they are actually very important>>
* A `TECH_DEBT.md`
* A `FUTURE_IDEAS.md`
* Or even an ADR marked as “deferred”

This keeps momentum without letting the feature balloon.

---

### Define an MVP or You’ll Drown

At the start of any project, I force myself to define a strict MVP:

* A short list of features that *must* exist
* Everything else is explicitly labeled “post-MVP”

This matters even more with AI, because it will happily build *everything* you vaguely imply.

You will still accumulate:

* Tech debt
* Security notes
* Nice-to-haves

That’s fine. That’s healthy.
What’s not fine is pretending all of that belongs in v1.

Backlogs are better than scope creep.
<<keeping these in markdown - and any other 'categories' of running note pads the agent can use is great. have a whole folder of them. and dont even worry about then til later. DONT EVEN GET TEMPTED>>

---

### Multiple Sources of Truth Will Confuse Everyone — Especially AI

This is an underrated pain point.

You describe what your app does:

* On the landing page
* In the README
* In the docs
* In code comments

Now they’re slightly different.

Humans notice this eventually. AI notices immediately — and gets confused.

Where possible, enforce a single source of truth. For example:

* A shared `content` or `docs` package
* One canonical “what this app does” document

Everything else should reference it, not rephrase it.

Consistency isn’t just cleanliness. It’s how you keep agents aligned.
