# Cronicorn: Platform-Specific Content Briefs

> **Based on successful developer tool launches and viral posts**

---

## 🟠 Hacker News (Show HN) - Day 8

### Vibe: Technical, Humble, Curious

**Title** (copy-paste ready):
```
Show HN: Cronicorn – AI-powered cron scheduler that learns from failures
```

### First Comment (Post Immediately After Submitting)

**Opening Hook**:
```
Hey HN! I'm [Name], creator of Cronicorn.

I built this after struggling with cron jobs that would fail silently at 3am.
```

**Key Topics to Hit** (in this order):

1. **The 3am Problem** (personal pain)
   - "Cron jobs fail silently"
   - "Woke up to 500 failed jobs, no idea why"
   - "Same timeout works Monday, fails Friday"

2. **The AI Solution** (technical but accessible)
   - "AI planner learns from job patterns"
   - "Auto-adjusts retry intervals based on failure history"
   - "If 3 jobs timeout at 30s → increases to 60s next run"

3. **Tech Stack** (HN loves this)
   - "TypeScript, PostgreSQL, Hono API, React dashboard"
   - "Built with hexagonal architecture"
   - "63 ADRs documenting every decision" ← [This is interesting to HN]

4. **What Makes It Different** (not marketing-speak)
   - "Traditional cron: fail → you fix it manually"
   - "Cronicorn: fail → AI learns pattern → auto-adjusts"
   - "It's like having a DevOps engineer watching your jobs"

5. **Easy to Try** (zero friction)
   - "Try it: `npx cronicorn init`"
   - "Takes 30 seconds"

6. **Humble Ask** (not "sign up", but "feedback")
   - "Open to feedback, especially on the AI planning logic"
   - "Happy to answer any questions!"
   - "What would you use this for?"

### Lines That Work (Use These Phrases)

✅ **"I built this after..."** (personal story)
✅ **"Here's how it works under the hood..."** (technical depth)
✅ **"Still figuring out..."** (humble, honest)
✅ **"Would love feedback on..."** (invites engagement)
✅ **"Open source, MIT license"** (trust signal)

### Lines to Avoid

❌ **"Revolutionary"**, **"game-changing"**, **"best"** (HN hates this)
❌ **"Sign up"**, **"get started"** (too salesy)
❌ **"We're disrupting..."** (instant downvote)

### When Comments Come In

**Pattern: Answer questions with technical depth + humility**

Example responses:
- Q: "How does the AI actually work?"
  - ✅ "Great question. Right now it's a simple pattern matcher that tracks job success/fail rates over time. If a job fails 3x with the same error (e.g., timeout), it adjusts the timeout parameter. Not fancy ML yet, but it works. Happy to share the algorithm if you're curious!"
  - ❌ "Our proprietary AI uses advanced ML models..."

- Q: "Why not just use X instead?"
  - ✅ "You're right, X is great for Y. I built Cronicorn because X doesn't handle Z well. Different trade-offs. For simple cron jobs, stick with X. Cronicorn shines when jobs have unpredictable patterns."
  - ❌ "Cronicorn is better because..."

- Q: "This seems over-engineered for cron"
  - ✅ "Fair point! For static schedules, definitely overkill. I built this because my jobs had unpredictable runtime (API calls, scraping, etc). If your jobs are predictable, you probably don't need this."
  - ❌ "You don't understand the problem..."

### Success Example Reference

[Convex launched on Reddit](https://www.markepear.dev/examples/reddit) with "Open sourcing 200k lines of Convex, a 'reactive' database built from scratch in Rust" - focused on technical depth + open source, not marketing.

---

## 🟣 Dev.to Posts - Day 2, Week 3, Month 2

### Post #1: "Why I Built Cronicorn" (Day 2)

**Vibe: Personal, Relatable, Journey**

**Title Options** (pick one):
- "I Built an AI Cron Scheduler After One Too Many 3am Pages"
- "Cron Jobs Failed Silently. So I Built an AI to Watch Them."
- "How I Built a Cron Scheduler That Learns From Failures"

**Key Hook** (first 2 lines):
```
Cron jobs fail. It's 3am. Your phone buzzes.

I got tired of this, so I built an AI that learns from those failures.
```

**Structure**:

1. **The Pain** (200 words - make it vivid)
   - Specific story: "March 15th, 3:47am. Slack notification: 'Job failed: timeout after 30s'"
   - The frustration: "Same job ran fine yesterday. Why today?"
   - The realization: "I'm spending 10 hours/month babysitting cron jobs"

2. **The Aha Moment** (100 words)
   - "What if cron jobs could learn from their own failures?"
   - "What if they auto-adjusted timeouts, retries, schedules?"
   - "Like having a junior DevOps engineer watching every job"

3. **How It Works** (300 words - technical but accessible)
   - "Built an AI planner that tracks job patterns"
   - Code example showing the difference:
     ```javascript
     // Traditional cron
     cron.schedule('0 */6 * * *', runJob); // fails at 3am, you get paged

     // Cronicorn
     cronicorn.schedule('0 */6 * * *', runJob); // fails at 3am, AI adjusts next run
     ```
   - "The AI watches success/fail rates, error patterns, runtime"
   - "If 3 jobs timeout at 30s → bumps to 60s for next run"

4. **The Tech** (100 words)
   - "TypeScript + PostgreSQL + React"
   - "Hexagonal architecture (ports & adapters)"
   - "Why hexagonal? Because I wanted the AI logic completely isolated"
   - Link to architecture diagram

5. **What's Next** (50 words)
   - "Still early. Lots to figure out."
   - "Want to add: predictive scheduling, cost optimization, team alerts"
   - "But first: make the core super solid"

6. **Try It** (CTA)
   ```
   Try it yourself:
   npx cronicorn init

   GitHub: [link]

   Would love your feedback! What would you use this for?
   ```

**Key Lines to Include** ([Based on viral Dev.to posts](https://dev.to/hanzla-baig/the-ultimate-guide-to-writing-viral-posts-on-devto-59h3)):
- "I learned [specific thing] the hard way"
- "Here's the mistake I made..."
- "Turned out, the solution was simpler than I thought"
- "Here's the code that made the difference:"

**Tags**: `typescript`, `node`, `opensource`, `ai`

**Cover Image**: Unsplash search "cron" or "automation" or "time"

---

### Post #2: "What I Learned Launching on Hacker News" (Week 3)

**Vibe: Transparent, Data-Driven, Helpful**

**Title**:
```
I Launched My Dev Tool on Hacker News. Here's What Happened.
```

**Key Topics**:

1. **The Numbers** (be specific)
   - "Front page for 6 hours"
   - "8,347 visitors, 43 signups (0.5% conversion)"
   - "87 GitHub stars (up from 12)"
   - "But only 5 real users"

2. **What Worked**
   - "Being available to answer questions immediately"
   - "Admitting limitations: 'You're right, X doesn't work yet'"
   - "Showing code, not marketing copy"
   - "The phrase 'built with hexagonal architecture' got more questions than the AI"

3. **What Didn't Work**
   - "My first title was too salesy (included 'best')"
   - "Tried to answer every comment in <5 min → burned out"
   - "Traffic spike ≠ users (learned this the hard way)"

4. **Key Lesson**
   - "5 users who try it and give feedback > 500 visitors who bounce"
   - "HN is for finding early believers, not launching to millions"
   - "Best comment: 'This is overengineered for cron' → led to best feature idea"

5. **For Your Launch**
   - Checklist of what to do
   - Timing (Sunday 12 PM UTC)
   - Template for first comment

**Include Screenshots**:
- HN traffic spike (Google Analytics)
- Top comments (screenshot)
- GitHub stars graph

---

### Post #3: "How Cronicorn's AI Learns From Failures" (Month 2)

**Vibe: Technical Deep-Dive, Educational**

**Title**:
```
Building an AI That Learns From Cron Job Failures: A Technical Deep-Dive
```

**Key Topics**:

1. **The Algorithm** (show code)
   ```typescript
   interface JobPattern {
     jobId: string;
     failureRate: number;
     commonErrors: ErrorPattern[];
     avgRuntime: number;
   }

   function adjustParameters(pattern: JobPattern): JobConfig {
     // If timeouts are common, increase timeout
     if (pattern.commonErrors.includes('timeout')) {
       return { timeout: pattern.avgRuntime * 1.5 };
     }
     // If rate limiting, space out retries
     if (pattern.commonErrors.includes('rate_limit')) {
       return { retryDelay: exponentialBackoff() };
     }
   }
   ```

2. **Pattern Recognition**
   - "We track 3 things: error type, time of day, runtime"
   - "Example: Job fails every Friday 5pm → likely traffic spike"
   - "AI recommendation: run Friday job at 3am instead"

3. **The Tradeoffs**
   - "Could use ML, but started with rule-based (simpler, more predictable)"
   - "Stores 90 days of history per job (balance accuracy vs. storage)"
   - "Updates recommendations every 10 runs (not too aggressive)"

4. **What I Learned**
   - "Simple rules beat complex ML for this problem"
   - "Users want explainability: 'Why did AI change my timeout?'"
   - "Edge case: AI can get stuck in 'adjustment loop' → added dampening"

**Include Diagrams**:
- Flowchart of decision logic
- Before/after comparison

---

## 🔴 Reddit Posts

### r/node - Day 9 (After HN Launch)

**Vibe: Community Member First, Founder Second**

**Title**:
```
I built an AI-powered cron scheduler in Node.js (launched on HN today)
```

**Post Body** (keep it short):

```
Hey r/node! 👋

I just launched Cronicorn on Hacker News and wanted to share with this community.

**What it does:**
AI-powered cron scheduler that learns from job failures and auto-adjusts timeouts/retries.

**Why I built it:**
Got tired of 3am pages for failed cron jobs. Built this to make jobs "self-healing."

**Tech stack:**
- Node.js + TypeScript
- PostgreSQL (for job history)
- React (dashboard)
- Hexagonal architecture

**Try it:**
npx cronicorn init

HN discussion: [link to HN post] ← people like seeing HN validation
GitHub: [link]

Would love feedback from Node devs! What pain points do you have with cron/scheduled jobs?
```

**Key Elements** ([Based on successful Reddit launches](https://www.markepear.dev/examples/reddit)):
- ✅ Introduce yourself as technical founder
- ✅ Link to HN discussion (social proof)
- ✅ Ask for feedback, not signups
- ✅ Be specific about tech stack
- ✅ Make it about community, not conversion

**When Comments Come**:
- Answer every question
- Be humble about what doesn't work yet
- If someone suggests improvement: "Great idea! Mind opening a GitHub issue?"
- If criticism: "Fair point. Here's my thinking... but I might be wrong"

---

### r/devops - Week 2

**Title**:
```
Show & Tell: Built a self-adjusting cron scheduler (learns from failures)
```

**Post Body**:

```
DevOps folks – curious about your cron pain points.

I built Cronicorn after spending too much time debugging why jobs that worked Monday failed Friday.

**The idea:**
What if cron jobs tracked their own success/failure patterns and auto-adjusted?

**Example:**
Job timeouts 3 times at 30s → AI bumps timeout to 60s next run
Job hits rate limits → AI spaces out retries exponentially

**Current status:**
- 10 early users in production
- Handles ~1K jobs/day
- Open source (MIT)

**Questions for this community:**
1. What's your biggest cron pain point?
2. Would you trust AI to adjust job parameters?
3. What would make you switch from current solution?

GitHub: [link]
Try: npx cronicorn init

Not here to sell, genuinely want to understand DevOps workflows better.
```

**Tone**:
- Ask questions > make claims
- "Curious about..." not "We solved..."
- Share numbers (10 users, 1K jobs/day) = transparency

---

### r/SideProject - Month 2

**Title**:
```
Built a "self-healing" cron scheduler. 2 months, 40 users, lots learned.
```

**Post Body**:

```
**The Journey:**
- Month 1: Built core, launched on HN (87 stars)
- Month 2: 40 real users, 15K jobs/day
- Learned: People care more about reliability than AI magic

**What it does:**
Cron scheduler where jobs learn from their own failures. Auto-adjusts timeouts, retries, schedules.

**Biggest lessons:**
1. HN traffic ≠ users (8K visitors → 5 users)
2. Personal outreach > viral posts (10 DMs → 8 users)
3. Users want "why did AI do this?" explanations

**What's next:**
- Predictive scheduling (run jobs when API is least loaded)
- Cost optimization (pause expensive jobs during peak hours)
- Team features (only if users ask!)

**Tech:**
Node.js, TypeScript, PostgreSQL, React

**For other side project folks:**
Happy to share launch playbook / growth tactics. AMA!

GitHub: [link]
Demo: [link]
```

**Tone**: Peer-to-peer, sharing learnings

---

## 🐦 Twitter/X Threads

### Thread #1: Launch Day (Day 9, Monday 9 AM EST)

**Vibe: Excited but Humble**

**Hook** (Tweet 1):
```
I launched Cronicorn on Hacker News yesterday 🚀

Built an AI-powered cron scheduler after one too many 3am pages

Here's what happened 🧵
```

**Structure** ([Based on viral thread frameworks](https://buildsolo.io/twitter-thread-template/)):

Tweet 2 - **The Problem**:
```
Cron jobs fail. It's frustrating.

Job runs fine Monday-Thursday
Fails Friday at 5pm
Same timeout, same code, different result

Spent 10 hours/month debugging this
```

Tweet 3 - **The Solution**:
```
What if cron jobs could learn from failures?

That's Cronicorn:
• AI tracks job patterns
• Auto-adjusts timeouts
• Spaces out retries
• Learns from history

Like having a junior DevOps watching every job
```

Tweet 4 - **Show the Tech** (with code screenshot):
```
Built with:
• TypeScript + Node.js
• PostgreSQL (job history)
• React (dashboard)
• Hexagonal architecture

Open source, MIT license

[Screenshot of code or architecture diagram]
```

Tweet 5 - **The HN Launch**:
```
Launched on HN Sunday 12 PM UTC

Results:
• Front page for 6 hours
• 8,347 visitors
• 87 GitHub stars
• 5 real users (this is what matters)

Traffic ≠ users 📉
```

Tweet 6 - **Key Lesson**:
```
Biggest lesson:

5 users who give feedback > 500 who bounce

Best growth came from:
• 10 personal DMs (8 users)
• Not HN (5 users)
• Not Reddit (2 users)

Personal outreach wins early
```

Tweet 7 - **Try It** (Soft CTA):
```
Try it yourself:

npx cronicorn init

GitHub: [link]
HN discussion: [link]

What's your biggest cron pain point?
Reply below 👇
```

**Formatting Tips** ([Viral thread best practices](https://www.hipclip.ai/workflows/how-to-create-x-twitter-threads-that-actually-go-viral-in-2025)):
- Keep tweets <200 characters (easy to skim)
- Add visual break (code screenshot) at Tweet 4
- Numbers in Tweet 5 (people love data)
- Question in Tweet 7 (drives replies)

---

### Thread #2: Technical Deep-Dive (Week 2)

**Hook**:
```
How Cronicorn's AI learns from cron failures 🧵

Not fancy ML. Just smart pattern matching.

Here's how it works:
```

**Structure**:

Tweet 2 - **Traditional Cron**:
```
Traditional cron:

Job fails → you get paged → you fix it manually

Every. Single. Time.

This doesn't scale.
```

Tweet 3 - **Cronicorn's Approach**:
```
Cronicorn tracks 3 things:

1. Error type (timeout, rate limit, etc)
2. Time of day (patterns matter)
3. Runtime (how long it usually takes)

[Chart showing pattern over time]
```

Tweet 4 - **Example 1**:
```
Example: Timeout pattern

Job times out 3x at 30s
→ AI bumps timeout to 60s

Simple rule, big impact

[Code snippet]
```

Tweet 5 - **Example 2**:
```
Example: Rate limiting

Job hits rate limit every run
→ AI adds exponential backoff
→ 1s, 2s, 4s, 8s delays

Prevents cascade failures
```

Tweet 6 - **Why Rules > ML**:
```
Could use fancy ML, but didn't

Why?
• More predictable
• Easier to explain ("AI changed timeout because...")
• Faster (no model training)
• Good enough for 90% of cases

Premature optimization is real
```

Tweet 7 - **CTA**:
```
Want to see the code?

It's open source: [GitHub link]

Or try it:
npx cronicorn init

Questions? Drop them below 👇
```

---

### Thread #3: Build in Public (Month 2)

**Hook**:
```
Cronicorn update: 2 months in 📊

40 users
15,000 jobs/day
Lessons learned

Thread 🧵
```

Tweet 2:
```
Month 1 → Month 2:

Users: 10 → 40 (+300%)
GitHub stars: 87 → 143 (+64%)
Jobs/day: 1K → 15K (+1400%)

But the real metric?
Active users: 5 → 28

That's what matters.
```

Tweet 3:
```
Top 3 features users actually use:

1. Auto-timeout adjustment (95% of users)
2. Failure alerts (78%)
3. Job history dashboard (65%)

What they DON'T use:
• Advanced scheduling (12%)
• Custom AI tuning (5%)

Build what they need, not what's cool
```

Tweet 4:
```
Biggest mistake:

Built analytics too early

Should have:
• Talked to 20 users first
• Found patterns manually
• THEN built features

Don't scale before finding fit
```

Tweet 5:
```
Best growth channel:

Personal DM to devs with cron pain

Template:
"Hey! Saw you tweeting about cron failures.
Built a tool that might help: [link]
Would love 5 min of feedback"

22/30 replied
18 tried it
```

Tweet 6:
```
What's next:

• Predictive scheduling (Q2)
• Cost optimization (Q3)
• Team features (if users ask)

Roadmap driven by user feedback, not my ideas

Public roadmap: [link]
```

Tweet 7:
```
For founders building dev tools:

Personal outreach > viral launches
5 real users > 500 tire-kickers
Feedback > features

Try Cronicorn: npx cronicorn init
GitHub: [link]

What's your build-in-public win? 👇
```

---

## 💬 Discord/Slack - Ongoing

### Node.js Discord (#showcase)

**Vibe: Community Member Sharing, Not Selling**

**Message**:
```
Hey folks! 👋

Built something for Node.js devs who deal with cron jobs.

Cronicorn - cron scheduler with AI that learns from job failures and auto-adjusts parameters (timeouts, retries, etc).

Built it after getting paged too many times at 3am for "timeout after 30s" errors.

Tech: TypeScript, PostgreSQL, React
Open source: [GitHub link]

Try: npx cronicorn init

Would love feedback from this community! What's your biggest cron pain point?
```

**Key**:
- Post in #showcase or #show-and-tell (check channel rules)
- Don't cross-post to multiple channels
- Be available to answer questions

---

### DevOps Community Slack

**Message**:
```
Quick show & tell:

Built a cron scheduler where jobs "learn" from their failures.

Example: Job times out 3 times → AI bumps timeout next run

Currently handling 15K jobs/day for 40 users. Still early, lots to figure out.

GitHub: [link]

Curious: How do you handle flaky scheduled jobs in production?
```

**Tone**: Question-first, tool-second

---

## 📧 Email/DM Outreach - Ongoing

### Template 1: Warm Connection (Saw them tweet about cron pain)

**Subject**: "Saw your cron struggles tweet"

**Body**:
```
Hey [Name]!

Saw your tweet about [specific cron issue] last week.

I just built Cronicorn - a cron scheduler that learns from job failures.
Built it for exactly that problem.

Example: If job times out 3x, AI adjusts timeout for next run.

Would love if you could try it and break it 🙂
I'll fix any bugs within 24 hours.

npx cronicorn init

Worth 5 min?

- [Your name]
GitHub: [link]
```

---

### Template 2: Previous Coworker

**Subject**: "Built something you might find useful"

**Body**:
```
Hey [Name],

Remember those cron jobs at [Company] that kept failing? 😅

I built a tool to solve exactly that: Cronicorn.

It's a cron scheduler where jobs learn from their failures and auto-adjust.
Think: timeouts, retry delays, scheduling.

Would love your feedback! You know this pain better than anyone.

Try: npx cronicorn init
GitHub: [link]

15-min call this week? Want to show you how it works.

Best,
[Your name]
```

---

### Template 3: Mutual Connection

**Subject**: "[Mutual friend] suggested I reach out"

**Body**:
```
Hi [Name],

[Mutual friend] mentioned you're dealing with [cron pain point] at [Company].

I just launched Cronicorn - an AI-powered cron scheduler that learns from
job failures. Launched on HN yesterday.

Would it be useful to try it out? Happy to hop on a quick call to show
you how it works.

npx cronicorn init

Best,
[Your name]

HN discussion: [link]
GitHub: [link]
```

---

## 🎯 Content Calendar (First 2 Weeks)

| Day | Platform | Content | Time |
|-----|----------|---------|------|
| Day 2 (Tue) | Dev.to | "Why I Built Cronicorn" | 10 AM EST |
| Day 3 (Wed) | Email/DM | 10 personal outreach messages | Throughout day |
| Day 8 (Sun) | HN | Show HN post | 12 PM UTC |
| Day 9 (Mon) | Twitter | Launch thread | 9 AM EST |
| Day 9 (Mon) | Reddit r/node | "I built..." post | 10 AM EST |
| Day 10 (Tue) | Discord | Node.js #showcase | Evening |
| Week 3 | Dev.to | "What I Learned from HN" | 10 AM EST |
| Week 4 | Twitter | Technical deep-dive thread | 10 AM EST |

---

## Key Principles Across All Platforms

**Based on research:**

1. **[Solve a real problem](https://dev.to/hanzla-baig/the-ultimate-guide-to-writing-viral-posts-on-devto-59h3)** - Don't sell features, solve pain
2. **[Be technical, not technical founder](https://www.markepear.dev/examples/reddit)** - Show code, share learnings
3. **[Curiosity > Claims](https://buildsolo.io/twitter-thread-template/)** - "What would you use this for?" > "Best tool ever"
4. **Numbers build trust** - "40 users, 15K jobs/day" > "Many users"
5. **[Easy to try](https://www.markepear.dev/blog/dev-tool-hacker-news-launch)** - `npx cronicorn init` in every post
6. **Ask for feedback, not signups** - "What's your cron pain?" > "Sign up now"
7. **Show, don't tell** - Code snippets > marketing copy

---

## Sources & Examples

- [Viral Dev.to Guide](https://dev.to/hanzla-baig/the-ultimate-guide-to-writing-viral-posts-on-devto-59h3)
- [Reddit Dev Tool Examples](https://www.markepear.dev/examples/reddit)
- [HN Launch Guide](https://www.markepear.dev/blog/dev-tool-hacker-news-launch)
- [Viral Twitter Threads](https://buildsolo.io/twitter-thread-template/)
- [Successful Reddit Launch: 1,500 signups, 300K views](https://guyandtheworld.medium.com/how-i-launched-my-product-on-reddit-to-get-1-500-sign-ups-and-300-000-page-views-3d878c22abc7)
