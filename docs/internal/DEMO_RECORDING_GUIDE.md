# Demo Recording Quick Start Guide

This is a practical, step-by-step guide for actually recording the Cronicorn product demo.

**Reference**: See [PRODUCT_DEMO_PLAN.md](./PRODUCT_DEMO_PLAN.md) for full strategic details.

---

## 🎯 Quick Reference

**Target Duration**: 2:30 - 3:00  
**Format**: Screen recording + voiceover  
**Resolution**: 1920x1080 @ 30fps  
**Tools Needed**: OBS Studio/Loom, Audacity/Adobe Audition, video editor

---

## 📋 Pre-Recording Checklist (30 mins)

### Environment Setup
```bash
# 1. Clean up your workspace
- [ ] Close all unnecessary applications
- [ ] Enable Do Not Disturb mode
- [ ] Hide desktop icons
- [ ] Clear browser notifications
- [ ] Set screen to 1920x1080 resolution
```

### Browser Setup
```bash
# 2. Prepare a clean browser profile
- [ ] Create new Chrome/Firefox profile for recording
- [ ] Disable all extensions (or use incognito)
- [ ] Zoom level: 100% or 125%
- [ ] Hide bookmarks bar (Cmd+Shift+B / Ctrl+Shift+B)
- [ ] Clear cookies and cache
```

### Demo Account Setup
```bash
# 3. Prepare Cronicorn account
- [ ] Create fresh account at cronicorn.com
- [ ] Verify email
- [ ] Delete any test jobs from previous runs
- [ ] Enable AI scheduling in settings
- [ ] Verify API key is generated
```

### Test Endpoint Setup
```bash
# 4. Set up controllable test endpoint
Option A: Use existing test API
- [ ] Confirm endpoint is accessible
- [ ] Test failure simulation works
- [ ] Verify recovery works

Option B: Create local mock server
- [ ] Install json-server or similar
- [ ] Configure routes with controllable behavior
- [ ] Test switching between success/failure modes
```

### Recording Software Setup
```bash
# 5. Configure screen recorder
- [ ] Install OBS Studio or Loom
- [ ] Set recording area (full screen or window)
- [ ] Configure audio input (optional if doing voiceover separately)
- [ ] Test recording quality
- [ ] Set output format: MP4, H.264 codec
```

---

## 🎬 Recording Steps

### Phase 1: Record Screen Actions (60-90 mins)

**Tip**: Record in segments, not one continuous take. Easier to edit!

#### Segment 1: Landing & Sign In (2 mins)
```
Actions:
1. Start recording
2. Navigate to https://cronicorn.com
3. Click "Sign in with GitHub"
4. Complete auth flow
5. Land on empty dashboard
6. Stop recording

Save as: 01-landing-signin.mp4
```

#### Segment 2: Create Job (3 mins)
```
Actions:
1. Start recording at dashboard
2. Click "Create Job"
3. Type: Name: "API Health Monitoring"
4. Type: Description: "Monitor our production API health endpoints"
5. Click "Create"
6. Job card appears
7. Stop recording

Save as: 02-create-job.mp4
```

#### Segment 3: Add Endpoint (5 mins)
```
Actions:
1. Start recording at job detail
2. Click "Add Endpoint"
3. Fill in form:
   - Name: "Main API Health Check"
   - URL: "https://api.example.com/health"
   - Method: GET
   - Schedule Type: "Interval"
   - Interval: 300000
   - Min Interval: 30000
   - Max Interval: 900000
4. Pause on constraints (let viewers read)
5. Click "Add Endpoint"
6. Endpoint appears in list
7. Stop recording

Save as: 03-add-endpoint.mp4
```

#### Segment 4: Baseline Execution (5 mins)
```
Actions:
1. Start recording at endpoint detail
2. Click "Runs" tab
3. Show execution timeline with regular intervals
4. Highlight several successful runs
5. Show response time ~200ms
6. Stop recording

Save as: 04-baseline-execution.mp4
```

#### Segment 5: Trigger Failures (10 mins)
```
Actions:
1. Start recording at runs tab
2. (Behind the scenes: Configure endpoint to fail)
3. Wait for 3 failures to occur
4. Show timeline with red markers
5. Show failure details in expanded view
6. Highlight error messages
7. Stop recording

Save as: 05-failures.mp4

Note: Use 4x time-lapse for wait times
```

#### Segment 6: AI Response (10 mins)
```
Actions:
1. Start recording when AI hint activates
2. Show notification: "AI adjusting schedule..."
3. Navigate to endpoint settings/info
4. Show "AI Hint" section:
   - Interval: 30 seconds
   - Reason: 3 consecutive failures
   - Expires in: 45 minutes
5. Go back to runs timeline
6. Show executions now every 30 seconds
7. Stop recording

Save as: 06-ai-response.mp4
```

#### Segment 7: Recovery (10 mins)
```
Actions:
1. Start recording at runs timeline
2. (Behind the scenes: Fix endpoint)
3. Wait for successful runs to appear
4. Show AI gradually backing off
5. Show hint expiration
6. Return to baseline schedule
7. Stop recording

Save as: 07-recovery.mp4

Note: Use 4x time-lapse for gradual backoff
```

#### Segment 8: Full Day Timeline (5 mins)
```
Actions:
1. Start recording
2. Navigate to timeline view
3. Zoom out to show full day
4. Highlight different periods:
   - Morning: regular intervals
   - Crisis: dense checks
   - Recovery: normal intervals
   - Evening: sparse checks
5. Stop recording

Save as: 08-full-timeline.mp4

Note: This might need to be pre-recorded with real data
```

#### Segment 9: Execution Detail (5 mins)
```
Actions:
1. Start recording
2. Click into a failed run
3. Show detailed execution record
4. Highlight:
   - Status code
   - Error message
   - Duration
   - Timestamp
   - Request/response data
5. Show filters and search
6. Stop recording

Save as: 09-execution-detail.mp4
```

#### Segment 10: AI Transparency (5 mins)
```
Actions:
1. Start recording at endpoint detail
2. Navigate to AI Status section
3. Show:
   - Current hint details
   - Baseline schedule
   - Safety constraints
   - Recent AI actions log
4. Pause on explanations
5. Stop recording

Save as: 10-ai-transparency.mp4
```

#### Segment 11: Comparison & CTA (3 mins)
```
Actions:
1. Prepare comparison slide (can be created in Figma/Keynote)
2. Record screen showing slide
3. Show traditional cron vs Cronicorn
4. Show CTA screen with links
5. Stop recording

Save as: 11-cta.mp4
```

---

### Phase 2: Record Voiceover (30-60 mins)

**Tip**: Record in a quiet room with a quality microphone.

#### Setup
```bash
# 1. Find quiet recording space
- [ ] Close windows (reduce outside noise)
- [ ] Turn off fans/AC (if possible)
- [ ] Silence phone
- [ ] Put "Recording - Do Not Disturb" sign on door

# 2. Set up microphone
- [ ] Use USB microphone (Blue Yeti, Rode NT-USB, etc.)
- [ ] Position 6-8 inches from mouth
- [ ] Use pop filter
- [ ] Test levels in Audacity (aim for -12 to -6 dB)

# 3. Warm up voice
- [ ] Drink water
- [ ] Do vocal exercises (hum, scales)
- [ ] Practice script 2-3 times
```

#### Recording
```bash
# Record each section separately
1. Read script naturally (don't rush!)
2. Pause 2 seconds between sections
3. If you make mistake, pause, then re-read sentence
4. Record 2-3 takes of each section
5. Save as: voiceover-raw.wav
```

**Full Script**: See PRODUCT_DEMO_PLAN.md > Script Template

#### Editing Audio
```bash
# In Audacity or Adobe Audition:
1. Remove silence/breaths between sections
2. Normalize audio to -3 dB
3. Apply noise reduction
4. Add subtle compression (ratio 3:1)
5. Export as: voiceover-final.wav (WAV 48kHz 16-bit)
```

---

### Phase 3: Video Editing (2-4 hours)

**Software Options**: 
- **Professional**: Adobe Premiere Pro, Final Cut Pro
- **Free**: DaVinci Resolve, Shotcut
- **Simple**: iMovie, Camtasia

#### Import & Organize
```
1. Create new project: "Cronicorn Product Demo v1"
2. Import all video segments
3. Import voiceover-final.wav
4. Create bins/folders:
   - Raw Footage
   - Audio
   - Graphics
   - Exports
```

#### Timeline Structure
```
Video Track 3: Graphics, annotations, callouts
Video Track 2: Transitions, overlays
Video Track 1: Main screen recordings

Audio Track 2: Background music (low volume)
Audio Track 1: Voiceover
```

#### Edit Sequence

**Act 1: Problem (0:00 - 0:30)**
```
1. Add title card: "Cronicorn Logo" (0:00-0:03)
2. Split-screen comparison graphic (0:03-0:15)
   - Left: static cron code
   - Right: metrics showing issues
3. Fade to Cronicorn tagline (0:15-0:30)
4. Sync voiceover with visuals
```

**Act 2: Setup (0:30 - 1:15)**
```
1. Add segment: 01-landing-signin.mp4
2. Speed up auth flow to 2x (make it snappy)
3. Add segment: 02-create-job.mp4
4. Add on-screen text: "Jobs group related endpoints"
5. Add segment: 03-add-endpoint.mp4
6. Add callout box highlighting min/max constraints
7. Sync voiceover
```

**Act 3: Magic (1:15 - 2:15)**
```
1. Add segment: 04-baseline-execution.mp4
2. Add annotation: "Regular 5-minute intervals"
3. Add segment: 05-failures.mp4
4. Speed up wait time to 4x
5. Add segment: 06-ai-response.mp4
6. Add callout: "AI adjusts automatically"
7. Add segment: 07-recovery.mp4
8. Speed up gradual backoff to 4x
9. Add segment: 08-full-timeline.mp4
10. Add annotations for different time periods
11. Sync voiceover carefully (this is the hero section!)
```

**Act 4: Control (2:15 - 2:45)**
```
1. Add segment: 09-execution-detail.mp4
2. Zoom in on important fields
3. Add segment: 10-ai-transparency.mp4
4. Add callout: "Every decision explained"
5. Sync voiceover
```

**Act 5: Close (2:45 - 3:00)**
```
1. Add segment: 11-cta.mp4
2. Add animated text: "cronicorn.com"
3. Add fade-out to black
4. End card with links (3-5 seconds)
5. Sync voiceover
```

#### Add Polish
```
1. Color correction (if needed)
   - Adjust brightness/contrast for consistency
   - Ensure text is readable

2. Transitions
   - Use subtle crossfades (0.5-1 second)
   - Avoid flashy transitions (keep it professional)

3. On-screen text
   - Font: Sans-serif (Inter, SF Pro)
   - Size: Large enough to read at 720p
   - Colors: Brand colors or high contrast
   - Duration: Long enough to read (3-5 seconds)

4. Callouts & Annotations
   - Use arrows, boxes, circles to highlight
   - Animate in/out smoothly
   - Don't overdo it (only for key points)

5. Background music (optional)
   - Very subtle, low volume (-25 to -30 dB)
   - Instrumental, non-distracting
   - Fade in/out at beginning/end
   - Sources: Artlist, Epidemic Sound, YouTube Audio Library
```

#### Review Checklist
```
Watch full video 2-3 times:
- [ ] Audio levels consistent throughout
- [ ] Voiceover syncs with visuals
- [ ] Text is readable on small screens
- [ ] No awkward pauses or dead time
- [ ] Transitions are smooth
- [ ] Call to action is clear
- [ ] Total duration: 2:30 - 3:00
- [ ] No typos in on-screen text
```

---

### Phase 4: Export & Publish (30 mins)

#### Export Settings

**Master Copy (High Quality)**
```
Format: MP4
Codec: H.264
Resolution: 1920x1080
Frame Rate: 30 fps
Bitrate: 10-15 Mbps (constant)
Audio: AAC 320 kbps

File: cronicorn-demo-v1-master.mp4
```

**Web Version (Optimized)**
```
Format: MP4
Codec: H.264
Resolution: 1920x1080
Frame Rate: 30 fps
Bitrate: 5-8 Mbps (variable)
Audio: AAC 192 kbps

File: cronicorn-demo-v1-web.mp4
```

**Mobile Version (Small)**
```
Format: MP4
Codec: H.264
Resolution: 1280x720
Frame Rate: 30 fps
Bitrate: 2-4 Mbps
Audio: AAC 128 kbps

File: cronicorn-demo-v1-mobile.mp4
```

**Animated GIF Preview (10 seconds)**
```
Extract key moment (AI adaptation)
Resolution: 800x600
Frame Rate: 15 fps
Duration: 10 seconds
Loop: Yes

File: cronicorn-demo-preview.gif
```

#### Upload to Platforms

**YouTube**
```
1. Upload cronicorn-demo-v1-web.mp4
2. Title: "Cronicorn: AI-Powered HTTP Job Scheduler Demo"
3. Description:
   """
   Cronicorn is an HTTP job scheduler that automatically adapts to your system.
   
   Unlike traditional cron jobs that run on fixed schedules, Cronicorn's AI learns 
   from your endpoints and optimizes timing in real-time—all while staying within 
   your safety constraints.
   
   ⏱️ Timestamps:
   0:00 - The Problem with Static Cron
   0:30 - Quick Setup (5 minutes)
   1:15 - AI Adaptation in Action
   2:15 - Full Visibility & Control
   2:45 - Get Started
   
   🔗 Links:
   Website: https://cronicorn.com
   Docs: https://docs.cronicorn.com
   GitHub: https://github.com/weskerllc/cronicorn
   MCP Server: npm install -g @cronicorn/mcp-server
   
   🎯 Key Features:
   ✓ Zero code changes required
   ✓ Automatic adaptation to failures/success
   ✓ Safety constraints (min/max intervals)
   ✓ Complete execution visibility
   ✓ AI decisions explained in plain English
   ✓ Self-hosting available
   
   #cron #scheduler #devops #automation #ai
   """
4. Tags: cron, scheduler, devops, automation, ai, http, api, monitoring
5. Thumbnail: Create custom thumbnail with key visual
6. Category: Science & Technology
7. Visibility: Public
```

**Vimeo**
```
Similar metadata as YouTube
Use for homepage embedding (better player)
```

**GitHub README**
```
# Option 1: Embed YouTube
[![Cronicorn Demo](https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg)](https://www.youtube.com/watch?v=VIDEO_ID)

# Option 2: Embed GIF
![Cronicorn Demo](./github/images/cronicorn-demo-preview.gif)

[Watch full demo (3 min) →](https://www.youtube.com/watch?v=VIDEO_ID)
```

**Website Homepage**
```
# Hero section
<video autoplay muted loop playsinline>
  <source src="/videos/cronicorn-demo-v1-web.mp4" type="video/mp4">
</video>

# Or use poster image with click-to-play
<video poster="/images/demo-poster.jpg" controls>
  <source src="/videos/cronicorn-demo-v1-web.mp4" type="video/mp4">
</video>
```

---

## 🎨 Graphics & Assets Needed

### Create Before Recording

**1. Title Card**
```
- Cronicorn logo (centered)
- Tagline: "HTTP Job Scheduler that adapts to your system"
- Duration: 3 seconds
- Tool: Figma, Canva
```

**2. Comparison Slide (Traditional vs Cronicorn)**
```
Split screen design:
Left: Traditional Cron
- Static schedules
- Manual adjustments
- No learning
Right: Cronicorn
- Adaptive schedules
- Automatic optimization
- AI learning

Tool: Figma, Keynote, PowerPoint
```

**3. Call to Action Screen**
```
- Large text: "cronicorn.com"
- Subtext: "Get Started Free"
- Secondary links:
  • Docs
  • GitHub
  • MCP Server
  
Tool: Figma, Canva
```

**4. Thumbnail for YouTube**
```
- Eye-catching visual
- Large readable text: "AI-Powered Cron"
- Cronicorn logo
- Duration indicator: "3 min"
- High contrast colors

Dimensions: 1280x720
Tool: Figma, Photoshop
```

**5. On-Screen Callouts/Annotations**
```
Prepare templates for:
- Arrow pointing to key UI elements
- Box highlighting important fields
- Text overlay with explanations

Tool: Figma, Adobe Illustrator
Export as PNG with transparency
```

---

## ⏱️ Time Budget

Total estimated time: **8-12 hours**

```
Pre-production (setup & preparation): 1-2 hours
Recording screen segments: 2-3 hours
Recording voiceover: 1 hour
Video editing: 3-5 hours
Review & revisions: 1 hour
Export & upload: 0.5 hours
```

**Pro tip**: Spread over 2-3 days, not one marathon session.

---

## 🚨 Common Pitfalls to Avoid

### Technical Issues
- ❌ **Low resolution**: Always record at 1920x1080 minimum
- ❌ **Choppy video**: Use 30 fps minimum, 60 fps preferred
- ❌ **Tiny text**: Zoom to 125% if text is hard to read
- ❌ **Audio echo**: Record in room with soft surfaces (carpets, curtains)
- ❌ **Background noise**: Use quiet environment or noise cancellation

### Content Issues
- ❌ **Too long**: Keep under 3 minutes or viewers drop off
- ❌ **Too fast**: Pause on key information for 2-3 seconds
- ❌ **Too much jargon**: Explain terms like "baseline schedule", "min/max intervals"
- ❌ **No clear CTA**: Always end with specific action (visit cronicorn.com)

### Pacing Issues
- ❌ **Long waits**: Use time-lapse or cuts for waiting periods
- ❌ **Rushed actions**: Let viewers see what you're clicking
- ❌ **Monotone voiceover**: Vary pitch and energy level
- ❌ **Dead air**: Music or ambient sound fills silence

---

## 📝 Post-Production Checklist

Before publishing:
```
- [ ] Watched full video on laptop screen
- [ ] Watched full video on mobile phone
- [ ] Audio is clear and consistent
- [ ] All text is readable at 720p
- [ ] No typos or grammar errors
- [ ] Calls to action are clear
- [ ] Links work correctly
- [ ] Video length is 2:30-3:00
- [ ] File size is reasonable (<100MB for web)
- [ ] YouTube description is complete
- [ ] Thumbnail is eye-catching
- [ ] Video is captioned/subtitled (accessibility)
```

---

## 🔄 Iteration Process

**After initial release, gather feedback:**

### Week 1
- Monitor view duration and drop-off rates
- Read comments for confusion points
- Check conversion metrics (sign-ups from video)

### Week 2
- Make minor edits based on feedback
- Re-export and replace if necessary
- Create derivative content (GIFs, clips)

### Month 2
- Consider v2.0 with additional features
- Add customer testimonials
- Show more complex use cases

---

## 📚 Additional Resources

### Screen Recording
- [OBS Studio Guide](https://obsproject.com/wiki/)
- [Loom Best Practices](https://www.loom.com/blog/screen-recording-tips)

### Voiceover Tips
- [Voice Acting for Technical Videos](https://www.youtube.com/watch?v=example)
- [Audacity Tutorial](https://manual.audacityteam.org/)

### Video Editing
- [DaVinci Resolve Tutorials](https://www.blackmagicdesign.com/products/davinciresolve/training)
- [Premiere Pro Basics](https://helpx.adobe.com/premiere-pro/tutorials.html)

### Design Assets
- [Figma for Video Thumbnails](https://www.figma.com/)
- [Canva Video Templates](https://www.canva.com/video/)

---

**Ready to record? Start with Phase 1, Segment 1. Good luck! 🎬**
