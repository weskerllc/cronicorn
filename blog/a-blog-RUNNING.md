This is my first and maybe last blog post.

I’ve avoided writing one for years because I never felt like an expert. There’s always someone smarter, deeper, and already writing about the same thing — usually better than I could.

That’s still true. I’m not an AI expert. I’m not the cleanest developer either.

I am a senior software engineer with 8+ years of experience. Enough scars to know when something’s going wrong. Not enough ego to pretend I’ve got it all figured out.

So why write this?

Because AI has been my main side obsession as a developer for the last two or three years. I've seen the glow-up from a clumsy helper to something that can write serious amounts of code. And I’ve spent hundreds — probably thousands — of hours building with it. Not demos. Things with consequences.

Most of my early projects ended badly.

I over-prompted. I over-generated. I let the code grow faster than my understanding. At some point, I wasn’t driving anymore. The project became messy, fragile, and exhausting to work on. Hours gone. Sometimes days. Starting over felt easier than fixing it.

That kind of failure sticks with you. Not just because of the wasted time, but because you start wondering whether you’re actually getting better or just burning attention.

After enough of those failures, patterns started to emerge. Rules. Ways of working where AI stays useful without taking over. Those rules weren’t researched or generated — they came from building the wrong way over and over.

That’s what this post is about.

If this helps you avoid even a fraction of the mistakes I made, it’s worth writing.

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

## Start With the Domain. Always.

When I start a new app, I want the domain to be boringly clean.

No frameworks.
No database.
No HTTP.
No imports I’ll regret later.

Just logic.

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
Add Redis because someone on Hacker News said it was “basically free performance.”

And still not have a single line of code that actually *does* anything.

That’s backwards.

That’s like buying a $400 Japanese knife before you know how to hold an onion.

Forget the database.
Forget the framework.
Forget Docker.

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
> * Core domain entities
> * Value objects
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

No IO. No magic. Just rules.

---

## Phase Two: Ports — What the Domain Needs

Now you ask a different question:

**What does my domain need from the outside world?**

Not *how* it gets it. Just *what*.

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

Start with the simplest possible adapter.
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

When you later add Postgres, you run the *same contract tests*.
If it passes, you trust it. If not, it doesn’t ship.

This is gold for AI workflows. You give it a contract, and you don’t argue with the output.

---

## The AI Feedback Loop

This is the workflow I recommend. No shortcuts.

**Step one: write tests first. Always.**

Before you ask AI to implement anything, you write the tests:

* Be explicit
* Cover edge cases
* Encode the behavior you actually want

Then you tell the AI two rules:

1. Run tests before marking a task “done”
2. Don’t break existing tests — ever

That alone prevents 80% of regressions.

---

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
