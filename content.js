// ─────────────────────────────────────────────────────────────
//  EDIT YOUR CONTENT HERE — the 3D desk and the computer's
//  desktop both read from this file.
//  Lines marked  ✏️  are placeholders waiting for your real info.
// ─────────────────────────────────────────────────────────────
window.SITE = {
  name: "Sijo Joseph",
  first: "SIJO",
  title: "Product, UX & AI Designer",
  focus: "Product, UX & AI designer",             // the role he is going for: said first, everywhere
  also: "Vibe coder",                             // second line of the role: he designs and builds with AI coding agents
  roleLines: ["Product & UX designer", "AI designer & vibe coder"],   // v148: the About "Role" tile, balanced over two lines
  education: "M.Des in Design for Retail Experience, NID Bengaluru",
  seeking: "Open to product, UX and AI design roles.",
  tagline: "Real people, real stakes, a process I don't skip. That's how a messy problem becomes a design that feels obvious.",   // v165: Sijo's pick (About lead)
  roles: ["Product Designer", "UX Designer", "AI Designer", "Vibe Coder", "Brand Strategist"],
  location: "Bangalore, India",
  email: "sijojoseph7509@gmail.com",
  analytics: "1bd5e5d0-dafc-4bae-8a4c-c4046bd56e07",   // Umami Cloud website ID (cloud.umami.is); empty = no counting. See track.js
  resumeUrl: "assets/Sijo_Joseph_Resume.pdf",     // v151: the one-page resume (a copy of the PDF in ~/Downloads); replace the file to update it
  links: {
    mail: "mailto:sijojoseph7509@gmail.com",
    linkedin: "https://www.linkedin.com/in/sijodesign",
    behance: "",                                 // ✏️ your Behance profile URL; the dock icon and Contact tile stay hidden while empty (v154)
    github: "https://github.com/sijojoseph7509-a11y"
  },

  about: [   // Sijo's own answers (interview, Oct 2026)
    "I'm Sijo, a multidisciplinary designer from Kerala, now based in Bangalore.",
    "I knew in my teens that I wanted a creative career, and design is where it led me. Along the way I've learned to use AI as a tool, not a shortcut: it makes my work faster and more efficient, while every project still follows my process, from research and framing to prototyping and testing.",
    "The poster on my wall says \"to begin an era\". It's my reminder that I'm meant to make something that matters, something that starts a new chapter.",
    "Away from the desk it's video games, football and long bike rides, with a playlist of phonk, Malayalam and Hindi songs. Shea, my cat, is usually close by."
  ],

  // Featured work (v154: Handovo first, the strongest proof for product and AI roles) — case studies exported from Figma (Syntra Documentation, Carekin Final, ekmaati final; Handovo rendered from tools/handovo/case.html).
  // `case.sections` are images in work/<slug>/; `color` tints the card while the cover loads.
  projects: [
    { title: "Handovo", tag: "Product Design \u00b7 AI UX", color: "#2F3BEA", status: "Pilot build for one real store", url: "#",
      result: "Tested 8,019 times: it never broke the manager's rules (store pilot next)",
      summary: "Helps a store manager run the day: type what matters today, and it becomes a to-do list on every staff phone. Anything risky waits for the manager's OK.",
      case: { slug: "handovo", coverSlide: ["fx/cover-slide.webp", 900], fx: "case-fx.js", fxOpts: { reveal: "none", accent: "#2F3BEA", videos: [[1, 688, 207, 623, 390, "highlight.mp4", 3], [3, 136, 602, 1169, 731, "tour.mp4", 3], [15, 104, 340, 1232, 321, "routing.mp4"], [18, 582, 183, 729, 455, "goal.mp4", 3], [19, 582, 70, 729, 455, "plan.mp4", 3], [22, 582, 130, 729, 455, "discount.mp4", 3], [23, 582, 130, 729, 455, "count.mp4", 3], [24, 127, 394, 553, 346, "soldout.mp4", 3], [24, 759, 394, 553, 346, "urgent.mp4", 3], [27, 127, 351, 553, 346, "handover.mp4", 3], [27, 759, 351, 553, 346, "digest.mp4", 3]], draw: [11, 290, 537, 1030, 170, "journey-curve.webp", [[762, 661]]], pops: [[5, 120, 372, 363, 96, "stat-1.webp", "rgb(11, 11, 15)"], [5, 539, 372, 363, 96, "stat-2.webp", "rgb(11, 11, 15)"], [5, 957, 372, 363, 96, "stat-3.webp", "rgb(11, 11, 15)"], [5, 120, 741, 572, 96, "stat-4.webp", "rgb(11, 11, 15)"]] }, sections: [   // rendered from tools/handovo/case.html by tools/handovo/render.mjs (screens from the Play the day prototype in ~/floor-pilot)
        ["01.webp", 1476, "Handovo helps a store manager run the day: the manager types what matters today, and it becomes a to-do list on every staff phone. Product design and AI UX, 2026, pilot build for one real store."],
        ["02.webp", 884, "The 90-second version: the problem (a manager’s plan rarely reaches every person on the floor; 63% of frontline workers say leadership messages don’t reach them), the insight (the AI works in the chat staff already use and the manager decides what it may do alone), my role (designed and built it myself) and the result so far (8,019 engine checks, never past the manager’s setting). Built with Figma, Next.js, Postgres, the Claude API and Vercel."],
        ["03.webp", 900, "At a glance: what I shipped (a working pilot build with the control room, rules engine, scheduler, Live AI with a scripted fallback and four languages), what I tested (8,019 rule checks with 0 times the agent went past the manager's setting; 80 of 95 staff messages read right by the fallback, all 15 misses still reached a person; 0 of 78 attack attempts got anything approved) and what I decided."],
        ["04.webp", 1509, "The finished design, Play the day: a scripted Thursday in a 30-person clothing store in Koramangala, with the control room on the left and a staff phone on the right."],
        ["05.webp", 985, "The problem: a store's day lives in the manager's head and a noisy WhatsApp group. Plans don't reach the floor, every small call goes up, and an AI agent can't just be let loose."],
        ["06.webp", 1068, "Context by numbers: about 8% of India's workforce is in retail (IBEF); 63% of frontline workers say leadership messages don't reach them and 1 in 3 lack the right tools (Microsoft Work Trend Index 2022); 400 million plus WhatsApp users in India (TechCrunch, 2019)."],
        ["07.webp", 1589, "Illustrated scenario, morning: the huddle, the manager typing the goal, a task on a staff phone and a discount request at billing. AI-generated illustrations in my style."],
        ["08.webp", 1509, "Illustrated scenario, midday to close: a stock count, a restock, an upset customer at Footwear and the evening handover. AI-generated illustrations in my style."],
        ["09.webp", 1121, "Research plan: five methods for the pilot, from shadowing a shift to four weeks of Activity logs, and a rule that no research numbers are invented."],
        ["10.webp", 947, "Competitive landscape: WhatsApp groups, huddles and registers, task apps and workforce suites compared with Handovo on five needs."],
        ["11.webp", 938, "Proto-personas: the store manager, Priya the shift lead, Meera on the floor and the owner, with needs, fears and the tool each uses."],
        ["12.webp", 937, "Journey map of the manager's day today, from huddle to close: what happens, the pain, a feeling curve and what changes with Handovo."],
        ["13.webp", 846, "The idea: one goal in, tasks out to every phone. Three settings per rule: Handles it, Asks you, Yours only. Rules run in code after the AI answers."],
        ["14.webp", 1004, "System architecture: staff chat, control room and scheduler feed a channel, a per-store pipeline, Claude and the rules engine, which acts, asks or holds."],
        ["15.webp", 996, "Service blueprint: what the manager, staff, the agent and the owner each do from the morning goal to close."],
        ["16.webp", 1018, "How a message is routed: a discount request is read as a price override and the rule decides; checks that fail, issues that always come up and locked rules."],
        ["17.webp", 826, "How the AI behaves: it acts alone only on low-risk, reversible work, asks first when it decides who does what, explains every task and decision, and fails safely to a person, never a guess."],
        ["18.webp", 1185, "The nine rules and why each default: low-risk actions run alone, the plan and leave ask first, money and people stay with the manager, ranking staff is off by design."],
        ["19.webp", 769, "Key flow 1: the manager writes one goal in plain words: rain is forecast, push rain jackets, count the white linen shirts, keep the fitting rooms tidy."],
        ["20.webp", 716, "Key flow 2: the agent drafts eight tasks, each with an owner picked by role, section, shift and load, and waits for the manager."],
        ["21.webp", 866, "Key flow 3: everyone gets only their own tasks, shown on two staff phones, one in English and one in Kannada."],
        ["22.webp", 776, "Key flow 4: the Tasks screen, where every task has an owner, a time, a status and a history."],
        ["23.webp", 776, "Key flow 5: a discount is the manager's call; a cashier asks for 15% off a rain jacket and the agent holds the reply and says which rule sent it."],
        ["24.webp", 776, "Key flow 6: a count that doesn't add up, 8 counted against 12 in the system, turns Handles it into Asks you, with the money at stake."],
        ["25.webp", 928, "Key flows 7 and 8: a sold-out size gets a restock task without asking; an upset customer always reaches the manager, marked urgent."],
        ["26.webp", 776, "Key flow 9: a blocked task comes to the manager with a suggested person to move it to."],
        ["27.webp", 750, "Key flow 10: the Rules screen, where the manager sets every rule to one of three settings."],
        ["28.webp", 885, "Key flows 11 and 12: open work moves to the evening shift at handover; the owner's digest shows sales and counts and never names or ranks staff."],
        ["29.webp", 1017, "Flows nobody has to start: a missed check-in, an overdue task and a sick day, step by step."],
        ["30.webp", 1020, "Edge cases: the AI failing, a message that tries to give orders, a busy day, no consent, an uncovered question, an unowned task, late-night messages and two messages at once."],
        ["31.webp", 898, "Language and access: staff write in English, Hindi, Kannada or Malayalam and reply with one tap; three staff phones. What is built for access, and what still needs testing with real people."],
        ["32.webp", 929, "Trust and privacy: what Handovo stores, what it never does, how staff stay in control, and the consent wording from the staff privacy notice."],
        ["33.webp", 810, "Design principles: the model suggests and code decides, always say why, no new app for staff, watch the work and not the people."],
        ["34.webp", 930, "Design system: Handovo blue, lime, ink and paper; Mona Sans and Inter; the routing chips Handles it, Asks you, Yours only and Off, status tags and the core components."],
        ["35.webp", 761, "How it would grow from one store to fifty: regional rule defaults, digest roll-ups without names, a new store set up from one spreadsheet, and a flat AI cost per store."],
        ["36.webp", 1035, "From prototype to pilot: what works today and what comes in phase 2 (WhatsApp) and phase 3 (billing feed)."],
        ["37.webp", 1601, "Testing the agent on the pilot build's own engine: 0 of 8,019 rule checks broke the manager's setting, 80 of 95 messages read right by the scripted fallback (English 52 of 54, Hindi 19 of 22, Kannada 5 of 10, Malayalam 4 of 9), all 15 misses still reached a person, and 0 of 78 attack attempts got anything approved. Live AI is not measured yet."],
        ["38.webp", 1199, "What the test changed: fixed \\\"khatam ho gaya\\\" (run out) being read as done and closing a restock task; kept the fallback cautious so unclear messages go to the shift lead word for word; Kannada and Malayalam stores run with Live AI on until native readers write the fallback keywords."],
        ["39.webp", 740, "Three decisions the tests changed: a Hindi phrase that closed a restock task now flags a reorder; messages the reader can’t place go to the shift lead word for word; Kannada and Malayalam keep Live AI on until native readers check the fallback."],
        ["40.webp", 813, "How I’d measure it: three north-star targets for the four-week pilot (40% fewer decisions reaching the manager, 90% of tasks on time, no open task lost at shift change) and four guardrails."],
        ["41.webp", 643, "What I'd do next: run the pilot for four weeks, get native readers to check every language, connect billing, read the photos staff send."],
        ["42.webp", 604, "Reflection: the hard part wasn't the AI, it was deciding what it may not do."],
        ["43.webp", 372, "Footer: Handovo, product design, AI UX and the working build by Sijo Joseph, 2026. The store and staff in the screens are the prototype's scripted demo; illustrations are AI-generated in my style."],
      ] } },
    { title: "Syntra", tag: "Interaction Design · Phygital Retail", color: "#F3E7D8", status: "Retail Tech, NID", url: "#",
      result: "66 tickets printed for visitors in one day at our exhibit",
      summary: "An interactive perfume finder for ZARA: turn a knob and three sliders, see your scent, step into its world in VR and take it home on a ticket that comes alive in AR.",
      case: { slug: "syntra", glance: ["glance.webp", 799, "At a glance: what we built (a working kiosk with a knob and three sliders on an ESP32, nine 360-degree worlds on a Meta Quest 3, thermal tickets that come alive in AR), what happened when people used it (66 tickets printed at our exhibit on 30 September 2026) and the three things we changed after watching visitors. Team of three; my part was the interaction and screens, the nine VR worlds, and the ticket and its AR."], cover: "fx/card.webp", coverSlide: ["fx/cover-slide.webp", 900], fx: "syntra-fx.js", stills: [1, 2, 8, 9, 10, 11, 15], sections: [
          // 2× exports of Figma "Syntra · Documentation" (RFow6mVvYRDVcu5NrMgO7D, page 223:2) with the moving parts left out; syntra-fx.js adds them back
        ["01.webp", 2725, "Syntra. An interactive perfume finder. Know the feeling, not the name? Let's find your perfume. Retail Tech module, NID, 2 weeks."],
        ["02.webp", 2330, "Meet Syntra: a kiosk you play like an instrument. A visitor in the VR headset at our exhibit, then four steps: turn, see, step in, take it home."],
        ["03.webp", 1857, "Choosing a scent is choosing how you'll be remembered. How we went about the process, as layers of a perfume bottle: concept, research, ideation, prototyping, experience."],
        ["04.webp", 2420, "The problem: shoppers arrive knowing a mood but the store speaks in names and notes. 24 options turn into 3% bought, 6 into 30%; 60% of US perfume users discover scents by trying them in store; the nose tires after 3 to 4 perfumes."],
        ["05.webp", 1972, "Current journey map from our store visits: walks in, browse, test, ask staff, decide, and where each step breaks. What shoppers and staff told us."],
        ["06.webp", 2350, "What we heard, again and again: people know the mood, not the notes; too many choices, too few words; the nose gives up before the mind does; nobody is there to translate."],
        ["07.webp", 2700, "Why these choices: physical controls because turning a knob feels like playing; ZARA because it is affordable, wide and focused; VR and AR because people remember a scent as a place."],
        ["08.webp", 3300, "How Syntra works: turn, read, score, match, then step in with a double press or print with a 2-second hold. Four controls, 162 settings, and how the match is weighed: mood 36%, expression 26%, occasion 22%, longevity 16%."],
        ["09.webp", 2950, "What the screen says back: the Femme result at 99%, five states from wake-up to your scent, and four different answers for four different settings."],
        ["10.webp", 3050, "Step inside the scent: nine real 360-degree worlds on a Meta Quest 3, from a flower garden to a starry lake, with the bottle on an oak plinth and the notes floating around you."],
        ["11.webp", 2160, "This isn't just a ticket: six thermal tickets printed at our exhibit, each with its own drawing, and the AR scan that lifts the drawing off the paper. 66 tickets printed on 30 September 2026."],
        ["12.webp", 3500, "Wires, foam and light: the ESP32 circuit and pin map, the backdrop from foam model to glowing channels, and what changed from first try to final."],
        ["13.webp", 2100, "Putting it in their hands: visitors at our exhibit, what confused them and what we changed, and what testers told us."],
        ["14.webp", 2200, "A scent found, felt and kept: the printed Syntra Manual in eight steps and the kiosk in use at our exhibit."],
        ["15.webp", 1544, "What we carry forward: what worked, what we'd do next, the team (Utsav Sharma, Sijo Joseph, Rajat Chaple), my part and the tools. Photo and licence credits, and a note that ZARA is not affiliated."],
      ] } },
    { title: "Carekin", tag: "UX / Product Design", color: "#0F3B38", status: "Self-initiated project", url: "#",
      result: "Figma prototype and test plan, not yet tested with carers",
      summary: "Helps families caring for an older parent: one medicine plan, an app for the person who plans and WhatsApp for the helper, so every change reaches everyone.",
      case: { slug: "carekin", glance: ["glance.webp", 691, "At a glance: what I designed (the Carekin app for the organiser and WhatsApp for the helper, a Figma prototype and walkthrough), what I decided (four ideas rejected, three tries at the What changed card) and what still needs testing: no carers have used it yet, and the test plan is ready."], coverSlide: ["fx/cover-slide.webp", 900], fx: "case-fx.js", fxOpts: { reveal: "none", accent: "#FF8A6B", videos: [[2, 440, 120, 960, 540, "walkthrough.mp4"]], draw: [19, 80, 330, 1280, 360, "journey-curve.webp", [[640, 620], [1060, 630]]] }, sections: [   // 2× export of Figma "Carekin · Case Study (Final)" (s6WXmDrd36Frlkg1kVsvUg, page 121:2)
        ["01.webp", 671, "Carekin makes sure everyone caring for a parent knows when a medicine changes, and when today's dose was given. UX / Product Design, Android app and WhatsApp, self-initiated, 2 weeks."],
        ["02.webp", 900, "The finished design: Lakshmi gets the dose on WhatsApp and taps Given, Priya sees it on the Carekin app, and a dose change reaches everyone."],
        ["03.webp", 760, "Watch it work: a 49-second walkthrough from a paper prescription to Given in the kitchen, recorded from the Figma prototype."],
        ["04.webp", 610, "Problem and solution: when a dose changes, only one person hears about it; 57.8% of family carers made a medication error in the past year. Carekin makes every change reach every carer: one medicine plan, seen three ways. My role: sole designer."],
        ["05.webp", 560, "Real voices from published research with family caregivers and older adults in Kerala."],
        ["06.webp", 2400, "What it does: six features, each answering a moment that goes wrong today, shown with real screens."],
        ["07.webp", 1160, "The brand: care plus kin, one capsule in two halves with a small gap, Google Sans Flex with Noto Sans Malayalam, tide teal and coral."],
        ["08.webp", 989, "Built like a product team would: links to the FigJam research board, the product design file, the prototype and the developer handoff."],
        ["09.webp", 300, "Snapshot: sole designer for research plan, product strategy, interaction and visual design; Android app plus WhatsApp; Figma."],
        ["10.webp", 1000, "A morning at home: the newspaper, the 8 am tablet, and family in other cities who want to know it was taken."],
        ["11.webp", 521, "The human friction: when Amma's dose changes in Thrissur, the worry is in the hand-offs, not the pillbox."],
        ["12.webp", 4574, "Illustrated scenario, A Tuesday in three cities: one dose changes and three people need to know."],
        ["13.webp", 516, "Context by numbers: 149 million Indians aged 60 and over in 2022, 347 million projected by 2050, and about 50% adherence to long-term medication."],
        ["14.webp", 452, "Why now: 75% of Indians aged 60 and over live with at least one chronic disease, and families already coordinate on WhatsApp."],
        ["15.webp", 900, "Photo spread: who Carekin is for, an older parent and the people around her."],
        ["16.webp", 693, "Research plan: five methods, each answering a different question."],
        ["17.webp", 773, "Competitive landscape: today's options remind one patient; none is built for several carers sharing one schedule."],
        ["18.webp", 536, "Proto-personas: Priya, 38, the organiser in Bangalore; Lakshmi, the helper at home; and Amma, the parent."],
        ["19.webp", 1000, "Who uses it, and how: three people share one medicine plan, each in their own way."],
        ["20.webp", 890, "Journey map: anxiety rises when a prescription photo goes to WhatsApp and the helper isn't told about the changed dose."],
        ["21.webp", 605, "Working insights: families coordinate in WhatsApp and won't leave it, so updates go into the chat."],
        ["22.webp", 900, "How care runs today: a helper's notebook, a sibling's WhatsApp thread abroad, and Amma's own routine."],
        ["23.webp", 1240, "System architecture: one schedule and one event log behind two surfaces, the Carekin app and WhatsApp."],
        ["24.webp", 820, "Prescription intake: paper stays the source; Carekin reads it, and a person checks every field before it goes live."],
        ["25.webp", 820, "Full-bleed photo of blister strips of tablets."],
        ["26.webp", 599, "Key flow: when the doctor changes a dose, everyone finds out and confirms."],
        ["27.webp", 844, "State machine: a change isn't live until every carer has seen it."],
        ["28.webp", 1000, "Sync and conflicts: Lakshmi logs a dose offline at 8:00 while Priya approves a lower dose, and how the conflict is resolved."],
        ["29.webp", 860, "Low-fidelity wireframes: Today, Home mode, What changed and Add medicine."],
        ["30.webp", 1786, "Graveyard of ideas: what I threw away and why, each idea failing one of the principles."],
        ["31.webp", 944, "Before and after: a dense medication list with overdue counts versus a plain-language Today view."],
        ["32.webp", 1000, "Full-bleed photo: the person at the centre never touches the app."],
        ["33.webp", 528, "Designing for Lakshmi: Home mode for helpers on shared phones, and changes that stay open until everyone confirms."],
        ["34.webp", 1240, "Text size: Home mode at Android's 200% text setting, still fitting the screen."],
        ["35.webp", 1160, "Feedback spec: motion, haptics and sound for the Given button."],
        ["36.webp", 1000, "Error prevention: an Already given warning stops a second dose."],
        ["37.webp", 760, "Photo: design for the hand that gives the tablet."],
        ["38.webp", 688, "Accessibility and language: 64 px buttons, 18 px minimum text, 4.5:1 contrast, Malayalam, Hindi and English."],
        ["39.webp", 1064, "Resilience: TalkBack labels for every element, and how it works without signal."],
        ["40.webp", 854, "Edge cases: two helpers on shifts, a changed phone number and other real-family situations."],
        ["41.webp", 724, "Scene at 9:40 pm: Priya in Bangalore, Arun in Dubai and Amma at home. Names are fictional."],
        ["42.webp", 962, "Usability test plan: eight tasks across three people, one prototype and five participants per role."],
        ["43.webp", 547, "How I'd measure it: zero doses given twice in a month, every carer confirming a change within a day. Targets, not results."],
        ["44.webp", 387, "Reflection: the screen was the easy part; the real design work was the hand-offs between people."],
      ] } },
    { title: "Ekmaati", tag: "Branding \u00b7 Packaging", color: "#2A1A10", status: "NID Semester 2 project", url: "#",
      result: "A temple box with no tape or plastic, shown at the NID jury",
      summary: "A name, a logo and a temple-shaped box for the hand-made clay Ganesh idols of Pen, a Maharashtra town famous for them.",
      case: { slug: "ekmaati", glance: ["glance.webp", 704, "At a glance: what I made (a temple box prototyped by hand that folds with no tape or plastic, plus the name, mark, colour, type, die line and two posters, shown at the NID Semester 2 jury), three cardboard prototypes and fourteen typefaces tried first, and the main choices from the decision log."], coverSlide: ["fx/cover-slide.webp", 900], cover: "13.webp", fx: "ekmaati-fx.js", sections: [   // [1× image (a 2× "@2x" file sits beside it), height px at 1440 wide, description], exported at 2× from Figma "ekmaati final"
        ["01.webp", 760, "Ekmaati cover: Ek maati, one clay (एक माती), with the mark large on earth and river lines rippling under it like water. A name, a mark and a temple-shaped box for the clay Ganesh idols of Pen; the idol goes back to the river, the box stays because it is the temple."],
        ["02.webp", 240, "Snapshot: sole designer for research, naming, identity, packaging and campaign; deliverables include the name, mark, colour, type, temple box, die line and two posters; a real project, prototyped by hand."],
        ["03.webp", 960, "Statement: these idols come home in bubble wrap and tape; I gave them a name, a logo and a temple-shaped box people want to keep."],
        ["04.webp", 529, "The human friction: a family brings home a hand-made river-clay idol in bubble wrap and tape; the missing pieces were a name, an identity and a box."],
        ["05.webp", 1000, "Sold by the row: hand-made river-clay idols, an officially recognised local craft, sold in rows like any seasonal item, with no name or maker."],
        ["06.webp", 620, "Why it matters: Pen Ganesh idols got a Geographical Indication in 2024, plaster-of-Paris idols were banned in 2020, and the box must survive the monsoon."],
        ["07.webp", 1240, "Research, how I got to the clay: a journey line through research, define, design and make, opening up to explore and narrowing to decide, with my own handwriting lifted off the paper at each step: the word dump, the maati heritage mind map, pencil marks and the names sticky note."],
        ["08.webp", 1100, "One clay: Ek maati means one clay in Marathi, the river clay every idol is made from, linking river, clay, hands and home."],
        ["09.webp", 691, "Naming: three routes, Penkara, Clay and Shrine, and Ekmaati, judged against faith, uniqueness and the buyer's language."],
        ["10.webp", 593, "Four design principles: from the clay, faith first, keep don't discard, and small places."],
        ["11.webp", 1056, "The mark: three strokes and a tilak, with a red tilak, two curved ears and a trunk drawn as one brushstroke, also reading as a person at prayer."],
        ["12.webp", 335, "The mark at size: the logo shown from 96 px down to 16 px, with a proposed minimum of 24 px on screen and 10 mm in print."],
        ["13.webp", 980, "Logo system: the primary lockup on snow and the mark on earth and robe backgrounds, with clear space and minimum size rules."],
        ["14.webp", 1037, "River lines brand asset: offset contour loops based on a riverbed, shown on snow, earth, gold and robe, with construction notes."],
        ["15.webp", 1100, "Colour from the festival: Gold Fusion from marigold garlands, Sindoor for the tilak only, and Monk's Robe from wet river earth, with contrast ratios."],
        ["16.webp", 1000, "Type shaped by hand: fourteen typefaces explored, with MV Boli for the wordmark and Anek Devanagari for Marathi."],
        ["17.webp", 1700, "Process hall of fame: logo iterations, three cardboard box prototypes, die lines and materials that led to the final box."],
        ["18.webp", 891, "Decision log: what was chosen, what was let go and why, for the name, mark, colour, type and box."],
        ["19.webp", 1300, "The temple box: a box that folds from flat sheets into a body, two roof tiers and a peak, with no tape or plastic; 350 GSM board, gold emboss and spot UV."],
        ["20.webp", 4372, "Illustrated narrative, The Festival Errand: a buyer picks a small Pen idol in a temple-shaped box, tears the arch at home, and keeps the temple after immersion."],
        ["21.webp", 1000, "Experience map, the errand mapped: six steps from the stall to the river, what the buyer does and thinks, a feeling curve drawn as a river line from curious and anxious to delight and bittersweet, and the design response at each step. Anticipated, not researched."],
        ["22.webp", 761, "Accessibility and edge cases: Marathi and English at equal weight, measured contrast and no reliance on colour, plus edge cases such as monsoon damp."],
        ["23.webp", 978, "Campaign, Big faith for small places: posters showing a detailed Ganesha on a desk among keyboards, glasses and sticky notes."],
        ["24.webp", 632, "Validation: how I'd know it works, including an unboxing test with five people and whether buyers keep the box as a shrine."],
        ["25.webp", 467, "Reflection: cardboard prototypes taught more than renders; next is co-designing the box with an artisan family in Pen and testing the unboxing."],
        ["26.webp", 1000, "Back to the water: the clay idol returns to water while the temple box stays."],
        ["27.webp", 997, "Footer: Ekmaati, branding and packaging, Semester 2 jury at NID, 2026, with role and credits."]
      ] } }
  ],

  // AI Lab (v148): things he designed and built himself, and how. Facts for Syntra come from its case study (work/syntra,
  // section 10, 11 and 15: WebXR on Meta Quest 3, MindAR, 66 tickets). `ai`: what AI did in the build (✏️ Sijo to fill in;
  // the line is hidden while empty). `draft: true` keeps an entry off the site until it has its details.
  aiLab: {
    intro: "Things I design and build myself: a game you can play right here, virtual worlds and an AR keepsake. Each one shows how it was made.",
    items: [
      { title: "Mumbai Local Straphanger", tab: "Mumbai Local", kind: "Game · Phone browser · Self-initiated",   // v160: playable on its first slide
        play: { src: "https://mumbailocalgame.github.io/", poster: "work/mumbai-local/tutorial.jpg",
          caption: "Hold the left or right half to lean (arrow keys on a computer)" },
        media: { type: "phone", src: "work/mumbai-local/tutorial.jpg", caption: "The 10-second tutorial ride: hold to lean against the sway" },
        gallery: [
          { type: "phone", src: "work/mumbai-local/ride.jpg", caption: "Peak hour: the grip gauge, the sway arrow and the next stop" },
          { type: "phone", src: "work/mumbai-local/sway.jpg", caption: "Near the edge: the commuter loses his footing" }
        ],
        summary: "A balance game for phones, built for a game design challenge. It's peak hour on a Mumbai local, and one overhead strap is all that keeps you on your feet: hold the left or right half of the screen to lean against the sway.",
        how: [
          "Built the game around one moment every Mumbai commuter knows: the train jerks, your feet slide, and a single strap keeps you off a stranger's lap.",
          "Designed the clutch save: each jerk is telegraphed 0.6 s ahead; at the edge time slows and your body glows red, and pulling back freezes the frame while the crowd cheers.",
          "Made decisions part of the world: at stations a chai-wala or a newspaper vendor reaches in from each edge, and you lean toward the one you want.",
          "Wrote all 340 strings in English, Hindi and Marathi, including station boards, share cards and announcements spoken by the phone's own voice.",
          "Designed for access: a colour-blind safe gauge, one-thumb mode, larger text, reduced motion, an assist mode and a break nudge after 20 minutes.",
          "Tested it with scripted touch tests on phone screens from 360 × 640 to 430 × 932, and tuned difficulty with a simulated novice player. Playtests with real commuters come next."
        ],
        ai: "The illustrations were generated with Figma AI in a Mario Miranda-inspired ink style and cut into a moving rig by the project's own script. The Hindi and Marathi text was written with machine help, with a review sheet ready for native speakers.",
        built: ["HTML canvas", "JavaScript", "Web Audio", "Speech synthesis", "Figma AI", "English · हिंदी · मराठी"],
        link: { href: "https://mumbailocalgame.github.io/press/", label: "Trailer and 24-page design doc ›" } },
      { title: "Step inside a scent", kind: "VR · Meta Quest 3 · Syntra", case: "syntra",
        media: { type: "pano", src: "work/syntra/fx/pano-lakeside_night.webp", caption: "One of the nine worlds: Lakeside Night (360° photo, Poly Haven, CC0)" },
        gallery: [   // v152: one image per slide after the overview
          { type: "photo", src: "work/syntra/fx/meet-hero.webp", caption: "A visitor in the headset at our exhibit" },
          { type: "pano", src: "work/syntra/fx/pano-symmetrical_garden_02.webp", caption: "Flower garden (360° photo, Poly Haven, CC0)" },
          { type: "pano", src: "work/syntra/fx/pano-rogland_clear_night.webp", caption: "Milky Way (360° photo, Poly Haven, CC0)" }
        ],
        summary: "In Syntra, a double press on the perfume kiosk puts you inside your scent: a real 360° world on a Meta Quest 3, with the bottle on an oak plinth and its notes floating around you.",
        how: [
          "Matched each of ZARA's 19 scents to one of nine real 360° worlds, from a flower garden to a starry lake, because people remember a scent as a place.",
          "Placed the bottle on an oak plinth in the middle of each world, with its top, heart and base notes floating around the visitor.",
          "Built it for the headset's browser with WebXR and JavaScript, triggered from the kiosk with a double press.",
          "Mirrored the same world on the kiosk screen, so the queue could watch what the visitor was seeing."
        ],
        ai: "",
        built: ["WebXR", "JavaScript", "Meta Quest 3", "360° photography (Poly Haven)", "ESP32 kiosk"] },
      { title: "A ticket that comes alive", kind: "AR · Phone browser · Syntra", case: "syntra",
        media: { type: "ticket", src: "work/syntra/fx/receipt-140032.webp", caption: "A real ticket from the exhibit: Man Gold, 30 September 2026" },
        gallery: [
          { type: "ticket", src: "work/syntra/fx/receipt-164936.webp", caption: "Femme, mood Romantic: its own drawing" },
          { type: "ticket", src: "work/syntra/fx/receipt-165536.webp", caption: "Vibrant Leather, mood Bold: a different drawing again" }
        ],
        summary: "A 2-second hold on the kiosk prints your scent on a 58 mm thermal ticket. Point a phone at its drawing and the drawing lifts off the paper.",
        how: [
          "Designed the ticket: the scent, its mood and notes, and a drawing of its own for each result.",
          "Made the drawing the AR marker, using MindAR image tracking in the phone's browser, so there is nothing to install.",
          "Kept it to two steps printed on the ticket itself: scan the code, then point the phone at the drawing.",
          "Printed 66 tickets for visitors at our exhibit on 30 September 2026."
        ],
        ai: "",
        built: ["MindAR", "JavaScript", "58 mm thermal printer", "QR code"] }
    ]
  },

  // Disciplines (Product Design first: it's the role he's going for) + the tools he uses (logos in icons.js)
  skills: [
    { group: "Product Design",    icon: "product", desc: "From research to tested prototypes and the UI systems behind them.",
      items: ["UX research", "Interaction design", "UI systems", "Prototyping", "Usability testing"] },
    { group: "AI & Vibe Coding",  icon: "ai", desc: "Designing with AI and building with it: prototypes, tools and this very site, shipped with AI coding agents.",
      items: ["Claude Code", "Codex", "ChatGPT", "Gemini", "Higgsfield", "Three.js / WebGL"] },
    { group: "Brand Strategy",    icon: "brand", desc: "Positioning, names and identities, with guidelines that hold them together.",
      items: ["Positioning", "Brand identity", "Naming & voice", "Campaigns", "Guidelines"] },
    { group: "Experience Design", icon: "experience", desc: "Services, journeys and the spaces people move through, modelled in Blender and SketchUp.",
      items: ["Service design", "Journey mapping", "Spatial / exhibit", "Workshops", "Blender", "SketchUp"] }
  ],
  tools: [
    { name: "Figma", icon: "figma" }, { name: "Photoshop", icon: "adobephotoshop" }, { name: "Illustrator", icon: "adobeillustrator" },
    { name: "SketchUp", icon: "sketchup" }, { name: "Blender", icon: "blender" }, { name: "Three.js", icon: "threejs" },
    { name: "WebGL", icon: "webgl" }, { name: "Framer", icon: "framer" }, { name: "Notion", icon: "notion" },
    { name: "Claude Code", icon: "claude" }, { name: "Codex", icon: "openai" }, { name: "ChatGPT", icon: "openai" },
    { name: "Gemini", icon: "googlegemini" }, { name: "Higgsfield", icon: null }
  ],

  experience: [    // the Resume window lists these; the full details are in the PDF
    { company: "Vero Moda India", role: "Senior Store Visual Merchandiser", from: "Oct 2024", to: "Jul 2025" },
    { company: "Marks & Spencer", role: "Visual Merchandiser", from: "Jun 2022", to: "Feb 2024" }
  ],
  studies: [
    { school: "National Institute of Design (NID), Bengaluru", degree: "Master of Design (M.Des), Design for Retail Experience", from: "2025", to: "2027 (expected)" },
    { school: "Amity University Mumbai", degree: "Bachelor's in Fashion Design", from: "2018", to: "2022" }
  ]
};
