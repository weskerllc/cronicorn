# Cronicorn: Content Writing Prompts & Outlines

> **Your voice, your story.** Use these outlines and prompts to write authentic content. Fill in with YOUR specific experiences, not generic examples.

---

## 📝 Day 2: Dev.to - "Why I Built Cronicorn"

### Outline

**Section 1: The Hook (2-3 sentences)**
- Start with a specific moment/incident
- Make it visceral and relatable

**Prompts:**
- What was the exact moment you decided to build this?
- Was there a specific 3am incident? What happened?
- What were you feeling? (frustrated? angry? determined?)

---

**Section 2: The Problem (150-200 words)**
- Paint the picture of the pain
- Use specific details from your experience

**Prompts:**
- How often were you dealing with failed cron jobs?
- What was the cost? (time lost, sleep lost, customer impact?)
- What made it so frustrating? (was it the unpredictability? the manual debugging?)
- What other solutions did you try before building this?
- Why didn't existing tools work for your use case?

**Questions to answer:**
- "Why was this happening to me?"
- "What was the breaking point?"

---

**Section 3: The Aha Moment (100 words)**
- The realization that led to building Cronicorn

**Prompts:**
- What insight did you have that made you think "I could solve this"?
- Was there a specific pattern you noticed in the failures?
- What made you think AI/learning could help?

**Fill in this sentence:**
- "I realized that _____ [pattern you noticed]"
- "What if instead of _____ [old way], jobs could _____ [new way]?"

---

**Section 4: How It Works (250-300 words)**
- Explain the solution technically but accessibly
- Use a before/after comparison

**Structure:**
1. **Traditional cron** (2-3 sentences showing the problem)
2. **Cronicorn's approach** (3-4 sentences on the core mechanism)
3. **Concrete example** (show one failure pattern → how AI adjusts)

**Prompts:**
- What's the simplest way to explain how the AI learns?
- What's ONE pattern it can fix that will make people go "oh, that's clever"?
- Can you show a code snippet that makes it click?

**Include:**
- [ ] A before/after code comparison (even if simple)
- [ ] One specific example of AI learning (e.g., "Job times out 3x → AI bumps timeout")

---

**Section 5: The Tech Stack (75-100 words)**
- What you built it with and WHY you chose those tools

**Prompts:**
- Why TypeScript over JavaScript?
- Why PostgreSQL for job history?
- Why hexagonal architecture? (what problem did it solve?)
- What was the hardest technical decision?

**Format:**
- Technology → Reason for choosing it
- Example: "PostgreSQL because I needed reliable job history queries, not just key-value storage"

---

**Section 6: What's Next (50-75 words)**
- Be honest about what's NOT done yet
- Share what you're figuring out

**Prompts:**
- What's still rough around the edges?
- What feature are you most excited to build?
- What question are you wrestling with?

**Tone:** Humble, curious, open

**Example sentence starters:**
- "Still figuring out..."
- "The next challenge is..."
- "I'm not sure yet if..."

---

**Section 7: The Ask (50 words)**
- Invite people to try it and give feedback

**Include:**
- [ ] `npx cronicorn init` (make it easy to try)
- [ ] GitHub link
- [ ] Specific question for readers

**Question ideas:**
- "What's your biggest cron pain point?"
- "Would you trust AI to adjust your job parameters?"
- "What would make this useful for your use case?"

---

### Writing Tips for Dev.to

**Voice:**
- First person ("I built this because...")
- Conversational (write like you're explaining to a friend)
- Technical but not jargon-heavy

**What makes it authentic:**
- Specific details (not "I had problems with cron" but "Every Friday at 5pm, job X would timeout")
- Your actual reasoning (not "best practices" but "I chose X because Y happened to me")
- Admitting what you don't know yet

**Avoid:**
- Marketing speak ("revolutionary", "game-changing")
- Generic statements ("cron jobs are hard")
- Pretending everything is perfect

---

## 📝 Day 5-7: Hacker News - First Comment

### What to Write

**Section 1: Introduction (2 sentences)**
**Prompts:**
- Who are you? (not your title, but your context)
- What's your relationship to this problem?

**Example format:**
- "Hey HN! I'm [Name]. I [built/maintain/work on] _____ and dealt with _____ problem."

---

**Section 2: The Origin Story (3-4 sentences)**
- Why you built this (be specific)

**Prompts:**
- What was the incident that pushed you to build this?
- How long were you dealing with this problem before building?
- What was the "I'm building this" moment?

**Fill in:**
- "I built this after _____"
- "The specific problem was _____"

---

**Section 3: What It Does (3-4 sentences)**
- Core mechanism, not all features

**Prompts:**
- What's the ONE thing it does differently?
- How would you explain it to a backend engineer in 30 seconds?
- What's the simplest example of it working?

**Include:**
- One concrete example of the AI learning
- The core loop (job fails → AI observes → AI adjusts → job succeeds)

---

**Section 4: Tech Stack (2-3 sentences)**
- Technologies + ONE interesting architectural decision

**Prompts:**
- What technology choice are you most proud of?
- What architecture decision was non-obvious?
- What would HN find interesting? (hexagonal architecture? ADRs? something else?)

**Format:**
- "Built with: [tech stack]"
- "Interesting choice: [one architectural decision and why]"

---

**Section 5: Try It + Invite Feedback (2-3 sentences)**

**Include:**
- [ ] `npx cronicorn init`
- [ ] GitHub link
- [ ] Specific area you want feedback on

**Prompts:**
- What are you most uncertain about?
- What part of the system could use expert eyes?
- What would you want HN's opinion on?

**Example:**
- "Open to feedback, especially on [specific technical area]"
- "Curious what HN thinks about [architectural choice]"

---

### HN-Specific Responses (When Comments Come)

**For "How does the AI work?"**
**Prompts to prepare your answer:**
- What's the actual algorithm? (be honest if it's simple)
- Can you show pseudocode?
- What did you try before this that didn't work?

**Structure:**
- Explain the mechanism (3-4 sentences)
- Show code or pseudocode if possible
- Admit limitations ("Not fancy ML, just pattern matching")

---

**For "Why not just use [existing tool]?"**
**Prompts:**
- What's legitimately good about that tool?
- What doesn't it do that you needed?
- For what use case would you recommend their tool over yours?

**Structure:**
- Agree on what's good about their suggestion
- Explain the specific gap you're filling
- Be honest about trade-offs

**Example format:**
- "[Tool] is great for [use case]. I built Cronicorn because [specific need]."
- "You're right, for [scenario], [tool] is better. Cronicorn is for [different scenario]."

---

**For "This seems overengineered"**
**Prompts:**
- Is it? (be honest with yourself)
- What's the simplest use case where this is NOT overkill?
- Who is this NOT for?

**Structure:**
- Acknowledge their point
- Define the scope where it makes sense
- Admit where it's overkill

**Example:**
- "Fair point! For static schedules, definitely overkill. I built this for [specific scenario]."

---

**For "What about [edge case]?"**
**Prompts:**
- Have you thought about this?
- If yes: how do you handle it?
- If no: is it important?

**Structure:**
- If handled: explain how
- If not handled: be honest, add to roadmap
- Thank them for the catch

**Example:**
- "Great catch! Right now it doesn't handle [edge case]. Adding to the roadmap."
- "Good question. Here's how it handles that: [explanation]"

---

## 📝 Day 9: Twitter Launch Thread

### Thread Structure (7 tweets)

**Tweet 1: The Hook**
**Prompts:**
- What happened yesterday? (HN launch)
- What's the one-line description?
- What's the personal angle? ("after too many 3am pages")

**Format:**
- Line 1: What you did
- Line 2: What it is (one sentence)
- Line 3: Your motivation (personal)
- Line 4: "Here's what happened 🧵"

---

**Tweet 2: The Problem**
**Prompts:**
- What specific scenario will developers recognize?
- What's frustrating about it?
- Can you show the pattern in 2-3 lines?

**Format:**
- Describe the pain (2-3 short lines)
- Make it specific enough to be relatable
- No solution yet (save for next tweet)

---

**Tweet 3: The Solution**
**Prompts:**
- What does Cronicorn do differently?
- Can you explain it in 3 bullet points?
- What's the "Like having a _____ watching your jobs" analogy?

**Format:**
- "That's Cronicorn:"
- • Bullet 1
- • Bullet 2
- • Bullet 3
- Analogy: "Like having a [role] watching every job"

---

**Tweet 4: Show the Tech**
**Prompts:**
- What's the tech stack?
- What technical choice are you proud of?
- Can you include a code screenshot or architecture diagram?

**Format:**
- "Built with:"
- • Tech stack (3-4 items)
- • One interesting decision
- [Visual element if you have one]

---

**Tweet 5: HN Launch Results**
**Prompts:**
- What were the actual numbers?
- What surprised you?
- What was the key lesson?

**Format:**
- "Results:"
- • Metric 1 (visitors, stars, etc.)
- • Metric 2
- • Metric 3 (real users - highlight this)
- Key insight (traffic ≠ users, or similar)

---

**Tweet 6: The Key Lesson**
**Prompts:**
- What worked better than expected?
- What didn't work as expected?
- What would you tell someone else launching?

**Format:**
- "Biggest lesson:"
- [One clear insight]
- "Best growth came from:"
- • Method 1 (X users)
- • Method 2 (Y users)
- Takeaway

---

**Tweet 7: The Try It + Engage**
**Prompts:**
- What do you want people to do?
- What question will spark replies?

**Format:**
- "Try it yourself:"
- [Command]
- [Links]
- Question to drive engagement

---

### Twitter Voice Tips

**Keep it:**
- Conversational (like DMing a friend)
- Specific (numbers, examples, names)
- Humble but confident

**Each tweet should:**
- Stand alone (people skim)
- Be <200 characters (ideally <180)
- Have one clear point

---

## 📝 Week 3: Dev.to - "What I Learned Launching on HN"

### Outline

**Section 1: The Numbers (100 words)**
**Prompts:**
- What were the actual results? (visitors, stars, users)
- What metric mattered most?
- What surprised you about the numbers?

**Structure:**
- State the numbers clearly
- Highlight the gap (8K visitors → 5 users, for example)
- Lead with the lesson

---

**Section 2: What Worked (200 words)**
**Prompts:**
- What tactics actually drove users?
- What comment/question got the most engagement?
- What did you do that you'd do again?

**Format:**
- 3-4 specific things that worked
- For each: what you did → what happened → why it worked

**Example:**
- "Being available to answer questions immediately"
- → "Replied to 30 comments in first 2 hours"
- → "People saw I was responsive, tried the tool"

---

**Section 3: What Didn't Work (200 words)**
**Prompts:**
- What did you expect to work but didn't?
- What mistake did you make?
- What would you change?

**Format:**
- 2-3 specific things that failed
- Be honest about why you thought they'd work
- What you learned

**Example:**
- "Tried to answer every comment in <5 minutes"
- → "Burned out after 3 hours"
- → "30-60 minutes is fine, don't kill yourself"

---

**Section 4: The Unexpected (150 words)**
**Prompts:**
- What comment challenged your assumptions?
- What use case did you not expect?
- What criticism was actually helpful?

**Format:**
- Share one surprising moment
- What it made you realize
- How it changed your approach

---

**Section 5: Key Lessons for Others (200 words)**
**Prompts:**
- What would you tell someone launching next week?
- What's one thing they must do?
- What's one thing they should skip?

**Format:**
- Checklist or bullet points
- Specific, actionable items
- Based on your actual experience

**Include:**
- Timing (Sunday 12 PM UTC?)
- Engagement strategy
- Expectations (traffic vs users)

---

**Section 6: What's Next (100 words)**
**Prompts:**
- What did you learn about your users?
- What are you building next based on feedback?
- What problem are you still solving?

**Format:**
- 2-3 insights from user conversations
- How you're adapting the product
- What you're figuring out

---

### Include Throughout

**Screenshots to add:**
- [ ] Google Analytics traffic spike
- [ ] HN front page (if you made it)
- [ ] Top 3 comments (screenshot)
- [ ] GitHub stars graph

**Data to share:**
- Exact visitor count
- Conversion rate (visitors → trials)
- Time on front page
- Comments/engagement

---

## 📝 Month 2: Dev.to - "How Cronicorn's AI Learns"

### Outline

**Section 1: The Problem This Solves (100 words)**
**Prompts:**
- What job failure pattern is this addressing?
- Why can't traditional cron handle this?
- What's a real example from your experience?

---

**Section 2: The Core Algorithm (300 words)**
**Prompts:**
- What does the AI actually track?
- What's the decision logic?
- Can you show the code?

**Format:**
- Explain what data you collect (error types, runtime, time of day)
- Show the pattern recognition logic
- Include actual code (TypeScript)

**Code to include:**
- Data structure for tracking patterns
- Decision function (when to adjust what)
- Example adjustment calculation

---

**Section 3: Concrete Examples (250 words)**
**Prompts:**
- What's the clearest example of it working?
- What pattern does it catch that surprised you?
- Can you show before/after?

**Format:**
- Example 1: Timeout pattern
- Example 2: Rate limiting pattern
- Example 3: Time-of-day pattern

**For each:**
- What happens (3 failures)
- What AI detects (pattern)
- What AI does (adjustment)
- Result (job succeeds)

---

**Section 4: Design Decisions (200 words)**
**Prompts:**
- Why simple rules instead of ML?
- What did you try that didn't work?
- What trade-off did you make?

**Structure:**
- Decision 1: Rules vs ML
  - Why you chose rules
  - When you might use ML

- Decision 2: How much history to keep
  - The trade-off (accuracy vs storage)
  - What you chose and why

- Decision 3: How aggressive to be with changes
  - The risk (adjustment loop)
  - Your solution (dampening)

---

**Section 5: What I Learned (150 words)**
**Prompts:**
- What surprised you about building this?
- What edge case caught you?
- What would you do differently?

**Format:**
- 2-3 lessons learned
- Specific examples of each
- What you changed as a result

---

**Section 6: Try It / Contribute (50 words)**
**Prompts:**
- What would you want developers to test?
- What part could use contributions?
- What feedback would help?

---

### Include

**Visuals:**
- [ ] Algorithm flowchart
- [ ] Before/after comparison
- [ ] Pattern detection graph

**Code blocks:**
- [ ] Data structure
- [ ] Core decision logic
- [ ] Example adjustment function

---

## 📝 Reddit Posts

### r/node (Day 9)

**Title:** [Write your version]
**Prompts:**
- Keep it factual, not salesy
- Include "launched on HN" (social proof)
- Mention the tech (Node.js/TypeScript)

**Body Structure:**

**Line 1: Who you are + context**
**Prompt:** How do you introduce yourself to the Node community?

**Line 2-3: What it does**
**Prompts:**
- One sentence: what is it?
- One sentence: why it's different

**Line 4-6: Tech stack**
**Prompts:**
- What Node/TypeScript features did you use?
- What libraries?
- What architecture?

**Line 7-8: The ask**
**Prompts:**
- What do you want to know from Node developers?
- What feedback would be most valuable?

**Include:**
- [ ] HN discussion link
- [ ] GitHub link
- [ ] `npx cronicorn init`

---

### r/devops (Week 2)

**Title:** [Your version - focus on DevOps angle]

**Body Structure:**

**Line 1-2: Question first**
**Prompt:** What do you want to know about how DevOps teams handle flaky jobs?

**Line 3-5: Your solution**
**Prompts:**
- What did you build?
- Why might it be relevant to DevOps?
- What problem does it solve?

**Line 6-8: What you're learning**
**Prompts:**
- What are your current users telling you?
- What patterns are emerging?
- What are you still figuring out?

**Line 9-10: Specific questions**
**Prompts:**
- What would you want DevOps input on?
- What would make this useful for DevOps workflows?

---

## 📝 Email/DM Outreach

### Template 1: Warm Connection

**Subject line:**
**Prompts:**
- Reference something specific they shared
- Keep it personal, not salesy

**Body:**

**Line 1: The connection**
**Prompt:** What did you see them share? (tweet, blog post, conversation)

**Line 2-3: Your context**
**Prompts:**
- What's your connection to the problem?
- Why are you reaching out to them specifically?

**Line 4-5: What you built**
**Prompts:**
- One sentence: what is it?
- One sentence: why it might help them

**Line 6: The ask**
**Prompts:**
- What do you want them to do?
- How long will it take?
- What's in it for them? (you'll fix bugs, give support, etc.)

**Line 7: Make it easy**
- Include `npx cronicorn init`
- Include GitHub link if relevant

---

### Template 2: Previous Coworker

**Subject line:**
**Prompt:** Reference shared context from when you worked together

**Body:**

**Line 1: The memory**
**Prompt:** What specific incident do you both remember?

**Line 2-3: The connection**
**Prompts:**
- How does Cronicorn solve that old problem?
- What would have been different if you had this tool then?

**Line 4-5: What you built**
**Prompts:**
- Quick explanation
- Why you think they specifically would appreciate it

**Line 6: The ask**
**Prompts:**
- Want their feedback specifically
- Can you show them how it works? (call)
- Will they try it?

---

## 🎯 Writing Principles (For All Content)

### Before You Write, Ask Yourself:

**Is this specific?**
- ❌ "Cron jobs can fail"
- ✅ "Last Tuesday, job X timed out at 3:47am"

**Is this my story?**
- ❌ "Best practices suggest..."
- ✅ "I tried X and it failed because..."

**Is this honest?**
- ❌ "Revolutionary AI technology"
- ✅ "Simple pattern matching that seems to work"

**Is this helpful?**
- ❌ "Sign up now!"
- ✅ "Here's what I learned - would this work for your use case?"

---

### Voice Checklist

Before publishing, read it out loud. Does it sound like:
- [ ] How you'd explain it to a developer friend?
- [ ] Something you'd actually say?
- [ ] Your personality (not a corporate blog)?

If no to any → rewrite that section.

---

### What Makes Content Feel Authentic

**Do:**
- Share specific numbers (not "many users" but "12 users")
- Admit what doesn't work yet
- Use "I" statements ("I built this because" not "we revolutionize")
- Reference specific moments ("March 15, 3:47am" not "one time")
- Show your actual code (even if it's simple)

**Don't:**
- Use marketing speak ("game-changing", "revolutionary")
- Pretend everything is perfect
- Hide behind "we" (unless you have a team)
- Make generic claims ("better performance")
- Copy templates word-for-word

---

## 📅 Content Calendar (What to Write When)

| Day | Content | Focus Question |
|-----|---------|----------------|
| Day 2 | Dev.to: Why I Built | What was the moment you decided to build this? |
| Day 5-7 | HN First Comment | What's the most interesting technical detail? |
| Day 9 | Twitter Thread | What surprised you about launching? |
| Day 9 | Reddit r/node | What do you want to learn from Node devs? |
| Week 3 | Dev.to: HN Lessons | What actually worked vs. what you expected? |
| Month 2 | Dev.to: Technical | How does the AI actually work? (show code) |

---

## 💡 When You're Stuck

**For any piece, ask:**
1. What's the ONE thing I want readers to remember?
2. What's the specific example that makes this real?
3. What am I actually trying to learn/figure out?
4. What would I tell a developer friend over coffee?

**Then write that.**

---

Remember: Your authentic voice > polished marketing copy. Write like you're helping another developer solve a problem, because you are.
