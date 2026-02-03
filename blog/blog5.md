In my opinion the most important rule is enforcing a clean architecture. After a ton of experimentation - I have found the hexagonal architecture to be most effective.

I used to think it was too much boilerplate. I didnt truly appreciate the value. I used to think - the less code the better. Which at the time mightve had some truths to it.

But now I pprioritize clean well defined boundaries over almost anything.

For example, when starting up an app - I like to have the domain logic clean. Very little dependencies - just clean logic defining the primitive inputs / outputs of your application. 

Some benefits of this is it makes things very testable, and it is easier to understand what your application actually does without any of the external hookups (postgres db / etc.)

If you dont understand - I'll spare you the trip to the docs and explain the value here.

what you DONT want to do is fire up the terminal, install seventeen packages, spin up a Postgres container, maybe throw in Redis because someone on Hacker News said it was fast—and they haven't written a single line of code that actually does anything yet.

That's backwards. That's like buying a $400 Japanese knife before you know how to hold an onion.
You start with the domain. The why. What does this thing actually do? What are the nouns? What are the verbs? Forget the database. Forget the framework. Forget Docker. 


This is a good time to think of what you are trying to build - and what the core functionality is. A great spot for having an ai agent think about this.

(INSERT SAMPLE PROMPT TO SEND TO AI TO GENERATE THE PORTS / ADAPTERS / ETC)

(insert code snippet here)

phase two: the ports. what does the domain need.

Now you ask: what does my domain need from the outside world? Not how it gets it. Just what.

(insert code snippet here)

(this is a good time )

phase three: the application layer. the recipes. This is where you orchestrate. Take the ingredients, follow the steps, produce something useful.

(insert code snippet here)


phase four: adapters 

i would suggest building the simplest possible adapters. this is eventually where your postgres database will be.

but i suggest setting up an in memory db adapter to get this thing running. this allows for rapid development and iteration without having to worry about things like db migrations / postgres docker containers / /etc. 

(insert code snippet of in memory adapter here)

phase five: wire it up and validate

(insert code snippet of composition root )

(HELP - fill this next section out - say something about what to do before actually hooking up a real db. tests? domain validation? etc.)

Phase Six: Now—And Only Now—The Database.
You've validated the domain. You've tested the logic. You know the thing works. Now you bring in the heavy machinery. Dont undereestimate the commitment here and how much this can slow down a project. 

Phase seven: wire for production.

Pre-AI - this type of architecture was not utilized alot by small teams that wanted to ship fast. But now with agentic coding - that isnt a problem anymore. 

This is how you build something that lasts. 