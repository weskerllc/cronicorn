# How I Stopped Letting AI Wreck My Projects

AI can generate code faster than you can understand it. That’s the problem.

I’ve spent the last couple of years building real systems with it — not demos, not experiments. And more than once, I let the code outrun my ability to reason about it. Nothing was obviously broken. Things just became harder to change, harder to trust, harder to explain.

By the time I noticed, starting over felt cheaper than fixing what I had.

I’m not an AI expert. I’m a senior engineer with about eight years of experience and enough failed projects to recognize that pattern when it shows up.

After repeating that mistake enough times, a few hard rules emerged. Not theory. Just constraints that kept me in control while still letting AI be useful. I ended up using them end-to-end in an app I rely on every day — [the code is public](https://github.com/weskerllc/cronicorn).

---

## Rule #1: Enforce Clean Architecture or Don't Bother

If you don't enforce **clear, enforced boundaries** early, AI will happily wreck your project for you.

Not all at once. Quietly.

The problem isn't that the code is bad. It's that it grows faster than your ability to understand it. AI can generate far more code than you can reason about, and that flips the usual bottleneck. Typing stops being the issue. Comprehension becomes the problem.

When there aren't hard boundaries, everything starts bleeding into everything else. Logic drifts. Responsibilities blur. Small changes get risky. Eventually, the project becomes something you don't want to touch.

I've watched this happen more times than I'd like to admit.

After enough of that, I stopped optimizing for speed or elegance. I started optimizing for one thing.

Clear, enforced boundaries.

After a lot of trial and error, the structure that's held up best for me is hexagonal architecture. Not because it's trendy or elegant, but because it makes it hard to mix concerns — even when code is being generated faster than you can read it.

I used to think it was overkill. Too many files. Too much ceremony. I was firmly in the "less code is better" camp, and at the time, that wasn't wrong.

What changed wasn't team size. It was output.

When AI enters the picture, "less code" stops being the main goal. Understanding does. And strict boundaries turn out to be the cheapest way to buy that back.

Everything that follows builds on this.

---

## Let AI Help You Shape the Domain

This is one of the few prompts I actually reuse.

At this stage, I'm not asking AI to build anything. I'm using it to help me think clearly — and name things correctly.

Here's the shape of the prompt:

```
I'm building a system that does X.
Ignore frameworks, databases, and infrastructure.
Help me identify:
- The core concepts in the system
- The data those concepts need
- The rules that must never be broken
- What goes in and what comes out
Respond using plain TypeScript interfaces and pure functions. No side effects.
```

The goal isn't completeness. It's clarity.

If you get the names wrong here, everything downstream gets harder. If you get them mostly right, the rest of the system tends to fall into place.

Here's the kind of output I'm looking for:

**domain/booking.ts**

```ts
export type BookingId = string;
export interface Booking {
  id: BookingId;
  guestName: string;
  slot: TimeSlot;
  status: "held" | "confirmed" | "cancelled";
}
export interface TimeSlot {
  date: string;
  startHour: number;
  durationMinutes: number;
}
export function confirmBooking(booking: Booking): Booking {
  if (!booking.slot) {
    throw new Error("Cannot confirm a booking with no time slot");
  }
  return { ...booking, status: "confirmed" };
}
```

No IO. No frameworks. Just rules.

You already know more about your system here than most projects do after weeks of setup.

---

## Ports — What the Domain Needs

Once the domain is clear, the next question is simple.

What does this logic need from the outside world?

Not how it gets it. Just what.

Things like:
- Saving and loading data
- Getting the current time
- Generating IDs
- Sending notifications

These needs become ports.

A port is just a contract. It's the domain saying, "I need this to exist, but I don't care how you do it."

**ports/booking-repository.ts**

```ts
import { Booking, BookingId } from "../domain/booking";
export interface BookingRepository {
  findById(id: BookingId): Promise<Booking | null>;
  save(booking: Booking): Promise<void>;
}
```

There's no SQL here. No ORM, no database client — the domain stays honest about what it needs. Everything else figures out how to supply it.

---

## The Application Layer

This is where things get assembled.

The application layer doesn't contain business rules. It doesn't decide what's allowed or forbidden. That all lives in the domain.

This layer just strings steps together.

**application/confirm-booking.ts**

```ts
import { BookingRepository } from "../ports/booking-repository";
import { confirmBooking } from "../domain/booking";
export async function confirmBookingUseCase(
  repo: BookingRepository,
  bookingId: string
) {
  const booking = await repo.findById(bookingId);
  if (!booking) {
    throw new Error("Booking not found");
  }
  const confirmed = confirmBooking(booking);
  await repo.save(confirmed);
}
```

Load something.
Check it exists.
Apply a rule.
Save the result.

This code knows when things happen, not why they're allowed.

---

## Adapters — Start Stupid on Purpose

Now you finally write implementations.

Start with the dumbest one that could possibly work. Not a real database — not migrations, not anything you'd have to maintain yet.

An in‑memory adapter.

**adapters/in-memory-booking-repo.ts**

```ts
import { BookingRepository } from "../ports/booking-repository";
import { Booking } from "../domain/booking";
export class InMemoryBookingRepository implements BookingRepository {
  private store = new Map<string, Booking>();
  async findById(id: string) {
    return this.store.get(id) ?? null;
  }
  async save(booking: Booking) {
    this.store.set(booking.id, booking);
  }
}
```

This adapter is boring. That's a feature.

It lets you run the system immediately.
It keeps feedback loops short.
It gives AI something safe to refactor without touching real data.

It proves the architecture works before you've committed to anything expensive.

---

## Wire It Up and Prove It Works

This is where everything finally touches.

There should be exactly one place where this happens.

The only place allowed to know about concrete implementations.

**main.ts**

```ts
import { InMemoryBookingRepository } from "./adapters/in-memory-booking-repo";
import { confirmBookingUseCase } from "./application/confirm-booking";
const repo = new InMemoryBookingRepository();
await confirmBookingUseCase(repo, "booking-471");
```

Before you add a real database, stop here.

Try to break it.

If something feels unclear now, adding Postgres won't fix it. It will just bury the problem.

---

## Now the Database

At this point, the system already works.

You know what needs to be stored. When it's read. When it's written. What happens when it isn't there.

Only now does a real database make sense. This is a commitment — it slows things down. But now it's worth paying.

Once the real adapter exists, you swap it in. Nothing else changes. If swapping the adapter feels complicated, something broke upstream.

---

## Why This Matters More in the AI Era

AI can generate scaffolding instantly.

What it can't do is decide where boundaries should exist — or defend them over time.

That part is still on you.

---

## Write Decisions Down or Expect Chaos

If you don't write decisions down, you'll argue with your past self later. Or worse — with an AI that has no idea why something exists.

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

I used to think tests were enough. They're not. AI can pass your tests and still produce code that's impossible to maintain — wrong names, tangled dependencies, inconsistent patterns. You need linting with teeth, and you need it running automatically.

---

## Tests

AI is fast. It's also very good at being slightly wrong.

Tests are how you keep it honest.

The domain gets the most coverage. No mocks. No IO. Just the rules, exercised directly.

If AI breaks a domain test, that's a hard stop. I've had AI "refactor" a validation function and silently change the behavior. The domain tests caught it. If those tests hadn't been there, I would've shipped it.

---

## The AI Feedback Loop

Here's what's worked for me: I describe the behavior I want first — explicitly, before any code gets written. Then I let AI take a pass at implementing it, including tests.

The first round is usually wrong in small ways. Off-by-one in the logic. Tests that assert the wrong thing. So I tighten the tests until they actually match what I meant, not just what AI guessed.

Two rules after that:
1. Tests must pass
2. Existing tests never break

If AI can't meet both, I roll back and re-prompt. No exceptions.

---

## Linting and Enforcement

Pick a strict ruleset.

Run it locally. Run it in CI.

If it fails, the work isn't done. I don't care if the feature works perfectly — if the linter is red, it doesn't ship.

---

## Other Things That Actually Matter

Define an MVP. Everything else gets written down and ignored.

Keep one source of truth. Everything else points to it.

---

## The Part I Don't Love Admitting

Letting AI run feels good. Watching files appear, functions fill in, edge cases get handled — it scratches the same itch as rapid prototyping used to, except faster and quieter. You tell yourself you'll come back and clean it up. Most of the time, that's a lie you don't catch until later.

I still mess this up. I still catch myself reading code that technically makes sense but doesn't feel owned yet. The difference now is that I notice sooner. When something feels slippery, I stop. I cut it back to the domain. It's annoying. It's slower. It's also cheaper than losing two days to a system I don't trust.

I usually realize things have gone wrong late at night. Tests are green. The house is quiet. I'm rereading the same function for the third time, and I can't explain why it exists without scrolling.

That's when I know the code got ahead of me — not because it's bad, but because I let something else drive for too long.
