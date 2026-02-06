# Other tips
- maybe talk about the importance of your ai config ymls (i.e. claude.md)
  - Ensure your agent doesn't over-engineer. Often times I like to say something like: 'favor simplicity / readability over sexiness or overcomplexity. Stay on track and do not add any unwanted bells or whistles. do not re-invent the wheel, etc'
  - Always use something like Context7 or web search to get up to date docs when doing anything library related.
  - Comments are okay - just keep them concise. concise is my favorite word to use with ai. this could be its own section




# Common problems
Some common problems I've faced.

- ai doesnt use what already exists. maybe a function or some logic that exists elsewhere. and it will rewrite it. sometimes exactly the same. sometimes slightly different. either way, this is a sign that either the ai is not looking for existing code correctly or your code isnt structured enough and documented enough to the ai that it would know WHERE to look.
- ai adds additional features within the feature its creating. sometimes it will ASSUME that you want bells and whistles - when often you really just want an mvp version of the feature. one solution to this is : instruct the ai to document 'future ideas' or even 'tech debt log' for times when it iss implementing a feature and it comes up with an issue. maybe a security flaw etc. its important to document even if it doesnt offroad and complete the new feature
- when starting a new project. strictly come up with an 'MVP' - a list of the minimal features that are required - and any bell or whistle should be documented as 'post-mvp'. as you can see - with tech debt, potential new features , security fixes, etc - you start to come up with a backlog of things to do. this is fine. this is better than scope creep out the ass.
- pain point: multiple spots to maintain source of truth. simple example: you have a statement of "what this app does". But you are defining that in your web app front page , your docs page, maybe some code comments, maybe your github readme, etc. This is an underrated issue that can mislead an ai agent. So wherever possible , maintain one source of truth - maybe a shared 'content' package that your web app, api, npm package, etc can import from. and then other spots like your readme can point to your docs or whatever where possible.
