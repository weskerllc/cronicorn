# How I Stopped Letting AI Wreck My Projects

This is my first — and maybe last — blog post.

I’ve avoided writing one for years. Not because I don’t have opinions, but because I never felt like an expert. There’s always someone smarter, deeper, already writing about the same thing. Usually better than I could.

That’s still true.

I’m not an AI expert. I’m not the cleanest developer either.

I am a senior software engineer with a little over eight years of experience. Enough scars to know when something’s going wrong. Not enough ego to pretend I’ve got it all figured out.

So why write this?

Because AI has been my main side obsession for the last two or three years. I’ve watched it go from a clumsy helper to something that can generate a scary amount of code. And I’ve spent hundreds — probably thousands — of hours building with it. Not demos. Real projects. Things that were supposed to hold up.

A lot of those projects went badly.

I over‑prompted. I let the code grow faster than my understanding. At some point, I wasn’t really driving anymore. The system still worked, technically. But it was fragile. Hard to change. Exhausting to think about.

Time disappeared. Hours at first. Then days. Starting over felt easier than fixing what I had.

That kind of failure sticks with you.

Not just because of the wasted time, but because you start wondering whether you’re actually improving — or just moving faster in the wrong direction.

After enough of that, patterns started to show up. Not theories. Not frameworks. Just rules that kept repeating themselves. Ways of working where AI stayed useful without quietly taking control.

None of this came from research. It came from building things the wrong way until the shape of “less wrong” became obvious.

That’s what this post is.

If it helps you avoid even a small part of what I ran into, it’s worth writing.

Let’s get into it.

---

## Rule #1: Enforce Clean Architecture or Don’t Bother

If you don’t enforce **clear, enforced boundaries** early, AI will happily wreck your project for you.

Not all at once. Quietly.

The problem isn’t that the code is bad. It’s that it grows faster than your ability to understand it. AI can generate far more code than you can reason about, and that flips the usual bottleneck. Typing stops being the issue. Comprehension becomes the problem.

When there aren’t hard boundaries, everything starts bleeding into everything else. Logic drifts. Responsibilities blur. Small changes get risky. Eventually, the project becomes something you don’t want to touch.

I’ve watched this happen more times than I’d like to admit.

After enough of that, I stopped optimizing for speed or elegance. I started optimizing for one thing.

Clear, enforced boundaries.

After a lot of trial and error, the structure that’s held up best for me is hexagonal architecture. Not because it’s trendy or elegant, but because it makes it hard to mix concerns — even when code is being generated faster than you can read it.

I used to think it was overkill. Too many files. Too much ceremony. I was firmly in the “less code is better” camp, and at the time, that wasn’t wrong.

What changed wasn’t team size. It was output.

When AI enters the picture, “less code” stops being the main goal. Understanding does. And strict boundaries turn out to be the cheapest way to buy that back.

Everything that follows builds on this.

---

## Phase One: Let AI Help You Shape the Domain

This is one of the few prompts I actually reuse.

At this stage, I’m not asking AI to build anything. I’m using it to help me think clearly — and name things correctly.

Here’s the shape of the prompt:

> I’m building a system that does **X**.  
> Ignore frameworks, databases, and infrastructure.
>
> Help me identify:
> - The core concepts in the system  
> - The data those concepts need  
> - The rules that must never be broken  
> - What goes in and what comes out  
>
> Respond using plain TypeScript interfaces and pure functions. No side effects.

The goal isn’t completeness. It’s clarity.

If you get the names wrong here, everything downstream gets harder. If you get them mostly right, the rest of the system tends to fall into place.

Here’s the kind of output I’m looking for:

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
    throw new Error("Cannot confirm an empty order");
  }

  return { ...order, status: "confirmed" };
}
```

No IO.  
No frameworks.  
Just rules.

You already know more about your system here than most projects do after weeks of setup.

That’s the advantage.

---

## Phase Two: Ports — What the Domain Needs

Once the domain is clear, the next question is simple.

What does this logic need from the outside world?

Not how it gets it. Just what.

Things like:
- Saving and loading data  
- Getting the current time  
- Generating IDs  
- Sending notifications  

These needs become ports.

A port is just a contract. It’s the domain saying, “I need this to exist, but I don’t care how you do it.”

```ts
// ports/order-repository.ts

import { Order, OrderId } from "../domain/order";

export interface OrderRepository {
  findById(id: OrderId): Promise<Order | null>;
  save(order: Order): Promise<void>;
}
```

There’s a lot missing here, on purpose.

No SQL.  
No ORM.  
No database client.

The domain stays honest about what it needs.  
Everything else figures out how to supply it.

---

## Phase Three: Application Layer

This is where things get assembled.

The application layer doesn’t contain business rules. It doesn’t decide what’s allowed or forbidden. That all lives in the domain.

This layer just strings steps together.

Think of it like a recipe. It doesn’t invent ingredients. It just says what happens, and in what order.

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

Load something.  
Check it exists.  
Apply a rule.  
Save the result.

This code knows when things happen, not why they’re allowed.

---

## Phase Four: Adapters (Start Stupid on Purpose)

Now you finally write implementations.

Start with the dumbest one that could possibly work.

Not Postgres.  
Not Drizzle.  
Not migrations.

An in‑memory adapter.

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

This adapter is boring. That’s a feature.

It lets you run the system immediately.  
It keeps feedback loops short.  
It gives AI something safe to refactor without touching real data.

It proves the architecture works before you’ve committed to anything expensive.

---

## Phase Five: Wire It Up and Prove It Works

This is where everything finally touches.

There should be exactly one place where this happens.

The only place allowed to know about concrete implementations.

```ts
// main.ts

import { InMemoryOrderRepository } from "./adapters/in-memory-order-repo";
import { confirmOrderUseCase } from "./application/confirm-order";

const repo = new InMemoryOrderRepository();

await confirmOrderUseCase(repo, "order-123");
```

Before you add a real database, stop here.

Try to break it.

If something feels unclear now, adding Postgres won’t fix it. It will just bury the problem.

---

## Phase Six: Now — And Only Now — The Database

At this point, the system already works.

You know what needs to be stored.  
When it’s read.  
When it’s written.  
What happens when it isn’t there.

Only now does a real database make sense.

This is a commitment. It slows things down.

But now it’s worth paying.

---

## Phase Seven: Wire for Production

Swap the adapter.

Nothing else changes.

If it isn’t boring, something went wrong earlier.

---

## Why This Matters More in the AI Era

AI can generate scaffolding instantly.

What it can’t do is decide where boundaries should exist — or defend them over time.

That part is still on you.

---

## Write Decisions Down or Expect Chaos

If you don’t write decisions down, you’ll argue with your past self later. Or worse — with an AI that has no idea why something exists.

I keep a `.adr/` folder at the root of every repo.

Any meaningful architectural decision gets a short markdown file.

Each ADR answers:
- What decision was made  
- Why it was made  
- What alternatives were considered  
- What tradeoffs were accepted  

ADRs become guardrails.

---

## Enforce Code Quality

This is how you keep AI from quietly wrecking your codebase.

Tests protect behavior.  
Linting protects sanity.  
Enforcement makes it real.

---

## Tests

AI is fast. It’s also very good at being slightly wrong.

Tests are how you keep it honest.

The domain gets the most coverage. No mocks. No IO.

If AI breaks a domain test, that’s a hard stop.

---

## The AI Feedback Loop

Be explicit about behavior first.

Have AI implement it.  
Have it write tests.  
Tighten the tests until they match what you actually want.

Two rules after that:
1. Tests must pass  
2. Existing tests never break  

---

## Linting and Enforcement

Pick a strict ruleset.

Run it locally.  
Run it in CI.

If it fails, the work isn’t done.

---

## Other Things That Actually Matter

Define an MVP. Everything else gets written down and ignored.

Keep one source of truth. Everything else points to it.

---

## Closing

None of this is theoretical.

Every rule here came from watching projects slowly slip out of my hands. Not blow up. Just get harder to change. Harder to trust.

AI didn’t cause that. It just sped it up.

Speed isn’t the enemy. Uncontrolled speed is.

You don’t need my setup. You don’t need my architecture.

But you do need clear, enforced boundaries.  
And you do need a way to say no.

The rest is details.
