This is my first and maybe last blog post.

I avoided writing one for years because I never felt like an expert. There’s always someone smarter, deeper, already writing about the same thing—usually better than I could.

That’s still true.

I’m a senior software engineer with 8+ years of experience. Enough scars to know when something’s going wrong. Not enough ego to pretend I’ve got it all figured out.

So why write this?

Because AI has been my main side obsession as a developer for the last two or three years. I’ve watched it go from a clumsy helper to something that can produce serious amounts of code. And I’ve spent hundreds—probably thousands—of hours building with it. Not demos. Things with consequences.

Most of my early projects failed.

I over-prompted. I over-generated. I let the code grow faster than my understanding. At some point, I wasn’t driving anymore. The project became messy, fragile, and exhausting to work on. Starting over felt easier than fixing it.

After enough of those failures, patterns started to emerge. Rules. Ways of working where AI stays useful without taking over. Those rules weren’t researched. They came from building the wrong way over and over.

That’s what this post is about.

If this helps you avoid even a fraction of those mistakes, it’s worth writing.

---------------------------------------

## Rule #1: Enforce Clean Architecture or Don’t Bother

Here’s the most important rule I’ve learned:

**If you don’t enforce a clean architecture early, AI will happily destroy your project for you.**

AI can generate code faster than you can reason about it. That flips the problem. Typing is no longer the bottleneck. Understanding is.

After a lot of experimentation, I’ve landed on **hexagonal architecture** as the most reliable way to stay sane.

I used to think it was overkill. Too much boilerplate. Too many files. I was firmly in the “less code is better” camp—and at the time, that wasn’t wrong.

What changed wasn’t team size. It was output.

So now I optimize for one thing above almost everything else:

**Clear, enforced boundaries.**

---

## Start With the Domain. Always.

When I start a new app, I want the domain to be boringly clean.

No frameworks.  
No database.  
No HTTP.  
No imports I’ll regret later.

Just logic.

The domain should define:
- What goes in
- What comes out
- The rules in between

That’s it.

If you can’t explain what your application does without mentioning Postgres, Kafka, or Docker, you don’t understand it yet.

This has real benefits:
- You can test everything without infrastructure
- You can read the code and understand the behavior
- AI has less surface area to hallucinate garbage

And it forces you to answer the hard questions early.

---

## What Not to Do

Don’t do this:

Fire up the terminal.  
Install seventeen packages.  
Spin up Postgres.  
Add Redis because someone on Hacker News said it was “basically free performance.”

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

This is a perfect moment to use AI—not to write code, but to think clearly.

---

## Phase One: Let AI Help You Shape the Domain

Here’s one of the few prompts I actually reuse.

**Sample prompt:**

> I’m building a system that does **X**.  
> Ignore frameworks, databases, and infrastructure.
>
> Identify:
> - Core domain entities
> - Value objects
> - Domain rules / invariants
> - Inputs and outputs
>
> Respond using plain TypeScript interfaces and pure functions. No side effects.

You’re not asking AI to build anything. You’re asking it to help you name things correctly. That alone saves hours.

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
````

No IO. No magic. Just rules.

---

## Phase Two: Ports — What the Domain Needs

Now ask a different question:

**What does my domain need from the outside world?**

Not how it gets it. Just what.

Persistence.
Time.
IDs.
Notifications.

These become ports—contracts, not implementations.

```ts
// ports/order-repository.ts

import { Order, OrderId } from "../domain/order";

export interface OrderRepository {
  findById(id: OrderId): Promise<Order | null>;
  save(order: Order): Promise<void>;
}
```

No SQL.
No ORM.
No database client.

That’s deliberate.

---

## Phase Three: Application Layer (The Recipes)

This is where things get assembled.

The application layer doesn’t contain business rules. It orchestrates them. Think of it as a recipe, not a chef.

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

Now you can do something useful—without committing to infrastructure.

---

## Phase Four: Adapters (Start Stupid on Purpose)

Now you finally write implementations.

Start with the dumbest possible adapter.

An in-memory one.

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
* Let AI refactor safely

This step alone has saved me days.

---

## Phase Five: Wire It Up and Prove It Works

This is the composition root—the only place things are allowed to touch.

```ts
// main.ts

import { InMemoryOrderRepository } from "./adapters/in-memory-order-repo";
import { confirmOrderUseCase } from "./application/confirm-order";

const repo = new InMemoryOrderRepository();

await confirmOrderUseCase(repo, "order-123");
```

Stop here and validate:

* Test the domain
* Test the application layer with in-memory adapters
* Break it on purpose

If something feels unclear now, a real database won’t fix it. It’ll just bury the problem.

---

## Phase Six: The Database (Now It’s Earned)

At this point:

* The logic works
* The boundaries are clear
* You know what needs to be stored

Now you bring in Postgres. Or whatever you actually need.

This is a commitment. Migrations, schemas, environments, credentials. It slows things down.

Now it’s worth paying.

Swap the adapter. Nothing else changes.

That’s the whole point.

---

## Why This Matters More in the AI Era

Before AI, teams skipped this because it took too long.

That excuse is gone.

AI can generate scaffolding. You provide discipline.

That’s how you move fast without losing control.

---

## Rule #2: Write ADRs or Expect Chaos

The second rule is simple:

**Write things down or expect chaos later.**

I keep a `.adr/` folder at the root of every repo.

Any meaningful architectural decision gets a markdown file. Short. Complete. Written while the decision is fresh.

Each ADR answers:

* What decision was made
* Why it was made
* Alternatives considered
* Tradeoffs accepted

No fluff.

Files are numbered so they’re ordered:

```
001-use-hexagonal-architecture.md
002-in-memory-adapter-first.md
003-postgres-over-mongodb.md
```

This matters for two reasons.

First: future you. You can see how the system got here without archaeology.

Second—and this is new—AI agents.

I tell agents to read and respect ADRs. If they violate them, I stop them. If they generate code, it has to align with documented decisions.

ADRs become guardrails.

---

## When Is a Decision “Big Enough” for an ADR?

Earlier than you think.

If you’re asking the question, the answer is yes.

I prefer too many ADRs over too few. Writing one takes minutes. Not writing one costs hours when:

* AI reintroduces rejected ideas
* You forget why something exists
* The architecture quietly drifts

An ADR doesn’t freeze a decision. It records intent.

---

## Rule #3: Enforce Code Quality Ruthlessly

This part isn’t optional.

For me, it’s three things:

* Tests
* Linting
* Enforcement (locally and in CI)

Miss one, and the system leaks.

---

## Tests: Your Control Surface

AI is fast. It’s also great at subtly breaking things.

Tests keep it honest.

### Domain Logic Comes First

The domain is sacred. Test it heavily.

No mocks.
No IO.

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

If AI breaks a domain test, that’s a hard stop.

---

### Application Services

This is where components touch.

Test:

* Happy paths
* Failure paths
* Boundary conditions

Use real implementations.

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

---

### Adapter Contracts

You don’t test every adapter exhaustively.

You test that each adapter fulfills the port contract.

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

Reuse it:

```ts
import { describe } from "vitest";
import { orderRepositoryContract } from "./order-repo.contract";
import { InMemoryOrderRepository } from "../adapters/in-memory-order-repo";

describe("InMemoryOrderRepository", () => {
  orderRepositoryContract(() => new InMemoryOrderRepository());
});
```

Same tests. Different implementations. No arguments.

---

## The AI Feedback Loop

The workflow is simple:

1. Write tests first
2. Tell AI not to break them
3. Stop when they fail

That alone prevents most regressions.

---

## Linting: Style Is Not a Debate

Tests protect behavior. Linting protects sanity.

I’m strict on purpose. One ruleset. Everyone follows it.

For TypeScript, I use ESLint with the antfu config.

Same rule as tests: lint must pass or the task isn’t done.

AI follows rules surprisingly well—if the rules are real.

---

## Enforce It in CI

Don’t rely on discipline.

Make it impossible to merge without:

* Passing tests
* Passing lint

The rules aren’t suggestions.