This is my first — and maybe last — blog post.

I’ve avoided writing one for years. Not because I don’t have opinions, but because I never felt like an expert. There’s always someone smarter, deeper, already writing about the same thing. Usually better than I could.

That’s still true.

I’m not an AI expert. I’m not the cleanest developer either.

I am a senior software engineer with a little over eight years of experience. Enough scars to know when something’s going wrong. Not enough ego to pretend I’ve got it all figured out.

So why write this?

Because AI has been my main side obsession for the last two or three years. I’ve watched it go from a clumsy helper to something that can generate a scary amount of code. And I’ve spent hundreds — probably thousands — of hours building with it. Not demos. Real projects. Things that were supposed to hold up.

A lot of those projects went badly.

I over-prompted. I let the code grow faster than my understanding. At some point, I wasn’t really driving anymore. The system still worked, technically. But it was fragile. Hard to change. Exhausting to think about.

Time disappeared. Hours at first. Then days. Starting over felt easier than fixing what I had.

That kind of failure sticks with you.

Not just because of the wasted time, but because you start wondering whether you’re actually improving — or just moving faster in the wrong direction.

After enough of that, patterns started to show up. Not theories. Not frameworks. Just rules that kept repeating themselves. Ways of working where AI stayed useful without quietly taking control.

None of this came from research. It came from building things the wrong way until the shape of “less wrong” became obvious.

That’s what this post is.

If it helps you avoid even a small part of what I ran into, it’s worth writing.

Let’s get into it.

---------------------------------------


### Rule #1: Enforce Clean Architecture or Don’t Bother

This is the most important rule I’ve learned working with AI:

If you don’t enforce clean boundaries early, AI will happily wreck your project for you.

Not all at once. Quietly.

The problem isn’t that the code is bad. It’s that it grows faster than your ability to understand it. AI can generate far more code than you can reason about, and that flips the usual bottleneck. Typing stops being the issue. Comprehension becomes the problem.

When there aren’t hard boundaries, everything starts bleeding into everything else. Logic drifts. Responsibilities blur. Small changes get risky. Eventually, the project becomes something you don’t want to touch.

I’ve watched this happen more times than I’d like to admit.

After enough of that, I stopped optimizing for speed or elegance. I started optimizing for one thing:

Clear, enforced boundaries.

After a lot of trial and error, the structure that’s held up best for me is **hexagonal architecture**. Not because it’s trendy or elegant, but because it makes it hard to mix concerns — even when code is being generated faster than you can read it.

I used to think it was overkill. Too many files. Too much ceremony. I was firmly in the “less code is better” camp, and at the time, that wasn’t wrong.

What changed wasn’t team size. It was output.

When AI enters the picture, “less code” stops being the main goal. **Understanding** does. And strict boundaries turn out to be the cheapest way to buy that back.

Everything that follows builds on this.

---
### Phase One: Let AI Help You Shape the Domain

This is one of the few prompts I actually reuse.

At this stage, I’m not asking AI to build anything. I’m using it to help me think clearly — and name things correctly.

Here’s the shape of the prompt:

> I’m building a system that does **X**.
> Ignore frameworks, databases, and infrastructure.
>
> Help me identify:
>
> * The core concepts in the system
> * The data those concepts need
> * The rules that must never be broken
> * What goes in and what comes out
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

At this point, nothing is “built.” But you already know more about your system than most projects do after weeks of setup.

That’s the advantage.

---

### Phase Two: Ports — What the Domain Needs

Once the domain is clear, the next question is simple:

What does this logic need from the outside world?

Not *how* it gets it. Just *what*.

Things like:

* Saving and loading data
* Getting the current time
* Generating IDs
* Sending notifications

These needs become **ports**.

A port is just a contract. It’s the domain saying, “I need this to exist, but I don’t care how you do it.”

Here’s what that looks like in code:

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

This file doesn’t know — or care — whether the data lives in memory, Postgres, or a spreadsheet someone updates by hand.

That separation buys you control.

The domain stays honest about what it needs.
Everything else figures out how to supply it.

---

### Phase Three: Application Layer (The Recipes)

This is where things get assembled.

The application layer doesn’t contain business rules. It doesn’t decide what’s allowed or forbidden. That all lives in the domain.

This layer just strings steps together.

Think of it like a recipe. It doesn’t invent ingredients. It just says what happens, and in what order.

Here’s a simple example:

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

There’s nothing clever here.

Load something.
Check it exists.
Apply a rule.
Save the result.

That’s the point.

This code knows *when* things happen, not *why* they’re allowed. If the rules change, this layer barely moves.

That separation is what keeps systems from turning into knots.

---

### Phase Four: Adapters (Start Stupid on Purpose)

Now you finally write implementations.

Start with the dumbest one that could possibly work.

Not Postgres.
Not Drizzle.
Not migrations.

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

This adapter is boring. That’s a feature.

It lets you run the system immediately.
It keeps feedback loops short.
It gives AI something safe to refactor without touching real data.

Most importantly, it proves the architecture works before you’ve committed to anything expensive.

I’ve saved days by doing this first. More than once.

---

## Phase Five: Wire It Up and Prove It Works

This is where everything finally touches.

There should be exactly one place where this happens.

The composition root.

It’s the only part of the system allowed to know about concrete implementations. Everything else stays ignorant on purpose.

```ts
// main.ts

import { InMemoryOrderRepository } from "./adapters/in-memory-order-repo";
import { confirmOrderUseCase } from "./application/confirm-order";

const repo = new InMemoryOrderRepository();

await confirmOrderUseCase(repo, "order-123");
```

That’s it.

Before you add a real database, stop here.

Try to break it.

Throw bad inputs at it.
Call things in the wrong order.
See what happens when assumptions fail.

If something feels unclear now, adding Postgres will not fix it. It will just bury the problem under configuration and ceremony.

Clarity is cheapest at this stage. Don’t waste it.

---

## Phase Six: Now — And Only Now — The Database

At this point, the system already works.

You know:

* What needs to be stored
* When it’s read
* When it’s written
* What happens when it isn’t there

Only now does a real database make sense.

This is a commitment. It slows things down. Schemas, migrations, credentials, environments. All of that friction is real.

But now it’s worth paying.

You’re not guessing anymore. You’re implementing something you already understand.

That difference matters.

---

## Phase Seven: Wire for Production

Once the database adapter exists, you swap it in.

Nothing else changes.

That’s the whole point.

If wiring for production requires touching your domain or application logic, something went wrong earlier.

When this works, it feels boring.

Boring is good.

---

## Why This Matters More in the AI Era

Before AI, small teams often skipped this structure because it took too long.

That excuse is gone.

AI can generate scaffolding instantly. What it can’t do is decide where boundaries should exist — or defend them over time.

That part is still on you.

This is how you move fast without losing control.
This is how systems survive their own growth.

---

## Next Rule: Write Decisions Down or Expect Chaos

The second rule is simple.

If you don’t write decisions down, you’ll argue with your past self later. Or worse — with an AI that has no idea why something exists.

I keep a `.adr/` folder at the root of every repo.

Any meaningful architectural decision gets a short markdown file. No exceptions. Written while the decision is still fresh.

Each ADR answers four things:

* What decision was made
* Why it was made
* What alternatives were considered
* What tradeoffs were accepted

That’s it.

No essays. No philosophy.

Files are numbered so they’re ordered:

```
001-use-hexagonal-architecture.md
002-in-memory-adapter-first.md
003-postgres-over-mongodb.md
```

This matters for two reasons.

First, future you. You can scan the folder and immediately see how the system got here, in order, without archaeology.

Second — and this is new — AI agents.

I explicitly tell agents to read and respect ADRs. When they suggest changes that violate them, I stop them. When they generate code, I expect it to align with documented decisions.

ADRs become guardrails.

---

## When Is a Decision “Big Enough” for an ADR?

Earlier than you think.

If you catch yourself asking, “should this be an ADR?” — the answer is almost always yes.

I strongly prefer too many ADRs over too few. Writing one takes minutes. Not writing one costs hours later when:

* AI reintroduces something you already rejected
* You forget why a choice was made
* The architecture quietly drifts

An ADR doesn’t mean the decision is permanent.

It just means it was intentional.

Intentional systems age better.

---

## Enforce Code Quality Ruthlessly

This part isn’t optional.

This is how you keep AI from quietly wrecking your codebase while smiling about it.

For me, this breaks into three things:

* Tests
* Linting
* Enforcement

If any one of these is missing, the system leaks.

---

## Tests: Your Primary Control Mechanism

AI is fast. It’s also very good at being slightly wrong.

Tests are how you keep it honest.

### Priority One: Domain Logic

The domain is sacred.

No mocks.
No IO.
No excuses.

If the rules live here, they get locked down.

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

This should be boring.

If AI breaks a domain test, that’s a hard stop.

---

### Priority Two: Application Logic

This is where things touch.

Repositories.
Use cases.
Sequencing.

Use real implementations where possible. In-memory adapters are perfect here.

You’re testing that pieces work together, not that mocks behave.

Most “reasonable” AI mistakes die here.

---

### Priority Three: Adapter Contracts

You don’t need to test every adapter exhaustively.

You need to test that each adapter fulfills the contract it claims to implement.

Same tests. Different implementations.

If the contract passes, you trust it.
If it fails, it doesn’t ship.

This is a gift to AI workflows. You give it a clear bar and stop debating the output.

---

## The AI Feedback Loop

Here’s the workflow I actually use.

I don’t start with perfect tests. I start by being explicit about behavior.

I ask the AI to:

* Describe what the function should do
* Implement it
* Write tests that reflect that behavior

Then I tighten the tests until they match what I *actually* want.

Two rules after that:

1. Tests must pass before a task is done
2. Existing tests never break

That alone prevents most regressions.

---

## Linting and Enforcement

Tests protect behavior. Linting protects sanity.

I don’t want to debate formatting or style — especially with AI involved.

Pick a strict ruleset. Make it non-negotiable. Run it locally and in CI.

If lint fails, the work isn’t done.

AI is very good at following rules when they’re real.

---

## Other Things That Actually Matter

A few patterns that decide whether AI helps you or slowly derails you.

### Be Explicit With Agent Instructions

Agent config files are part of the system.

I include rules like:

* Favor simplicity over cleverness
* Don’t add features that weren’t asked for
* Don’t reinvent existing abstractions
* Stay on task

Left alone, AI tends to chase “complete” instead of “correct.” These rules pull it back.

---

### Define an MVP or You’ll Drown

At the start of any project, define a strict MVP.

Everything else goes into:

* `TECH_DEBT.md`
* `FUTURE_IDEAS.md`
* or a deferred ADR

Write it down. Then ignore it.

Backlogs are healthier than scope creep.

---

### One Source of Truth

If your system is described in:

* the README
* the docs
* the landing page
* comments

They will drift.

Pick one canonical source. Everything else points to it.

Consistency isn’t aesthetics. It’s how you keep humans and AI aligned.

Got it. Same tone. Fewer words. Cleaner stop.

Here’s a tighter version that leaves the reader satisfied without lingering.

---

## Closing

None of this is theoretical.

Every rule here came from watching projects slowly slip out of my hands. Not blow up. Just get harder to change. Harder to trust. Easier to walk away from.

AI didn’t cause that. It just sped it up.

Speed isn’t the enemy. **Uncontrolled speed is.** When code grows faster than understanding, discipline stops being optional.

You don’t need to follow this exactly. You don’t need my architecture or my setup.

But you do need boundaries.
You do need decisions written down.
And you do need a way to say “no” — especially to a tool that’s always eager to say “yes.”

This is just what’s worked for me, after doing it wrong enough times to notice the pattern.

The rest is details.
