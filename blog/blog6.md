
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

If you want next, we can:

* Add a **“how AI breaks this if you don’t enforce it”** section
* Show a **real refactor from messy → hexagonal**
* Or write the **rules you give AI to keep it inside the lines**

This section is strong. Now it’s dangerous — in a good way.
