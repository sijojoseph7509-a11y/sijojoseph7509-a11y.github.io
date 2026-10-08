// ─────────────────────────────────────────────────────────────
//  EDIT YOUR CONTENT HERE — the 3D desk and the computer's
//  desktop both read from this file.
//  Lines marked  ✏️  are placeholders waiting for your real info.
// ─────────────────────────────────────────────────────────────
window.SITE = {
  name: "Sijo Joseph",
  first: "SIJO",
  title: "Multidisciplinary Designer",
  roles: ["Product Designer", "Brand Strategist", "Experience Designer", "3D Designer"],
  location: "Bangalore, India",
  email: "sijojoseph7509@gmail.com",
  resumeUrl: "#",                                // ✏️ link to your PDF
  links: {
    mail: "mailto:sijojoseph7509@gmail.com",
    linkedin: "https://www.linkedin.com/",       // ✏️
    behance: "https://www.behance.net/",         // ✏️
    github: "https://github.com/sijojoseph7509-a11y"
  },

  about: [   // Sijo's own answers (interview, Oct 2026)
    "I'm Sijo, a multidisciplinary designer from Kerala, now based in Bangalore.",
    "I knew in my teens that I wanted a creative career, and design is where it led me. My friends would describe me as smart, lazy and adventurous. Lazy in the useful way: I look for the simplest path to a good outcome, and I never skip the process to get there.",
    "The poster on my wall says \"to begin an era\". It's my reminder that I'm meant to make something that matters, something that starts a new chapter.",
    "Away from the desk it's video games, football and long bike rides, with a playlist of phonk, Malayalam and Hindi songs. Shea, my cat, is usually close by."
  ],

  // Featured work — case studies exported from Figma (Tidewell v3, Backwater Line v3, ekmaati final).
  // `case.sections` are images in work/<slug>/; `color` tints the card while the cover loads.
  projects: [
    { title: "Tidewell", tag: "UX / Product Design", color: "#0F3B38", status: "Concept project", url: "#",
      summary: "One calm care loop that joins the pillbox, the paper prescription and the family WhatsApp group, so everyone knows the evening dose was given.",
      case: { slug: "tidewell", cover: "02.webp", sections: [   // [1× image (a 2× "@2x" file sits beside it), height px at 1440 wide, description], exported at 2× from Figma "Tidewell v3"
        ["01.webp", 671, "Tidewell. One calm care loop that joins the pillbox, the paper prescription and the family WhatsApp group. UX / Product Design, Android app + WhatsApp, 2026, 2 weeks."],
        ["02.webp", 1031, "Hero screens: Home mode for Lakshmi with Amma's 8 am Metformin dose and a large Given button, beside Amma's Today view."],
        ["03.webp", 300, "Snapshot: sole designer covering research plan, product strategy, interaction and visual design; self-initiated; Android app for the organiser and WhatsApp for the helper; Figma."],
        ["04.webp", 1000, "A morning at home: the newspaper, the 8 am tablet, and family in other cities who want to know it was taken."],
        ["05.webp", 593, "The human friction: when Amma's dose changes in Thrissur, the worry is in the hand-offs, not the pillbox. Medicine apps exist, but they are built for one patient managing their own pills."],
        ["06.webp", 4900, "Illustrated scenario, A Tuesday in three cities: the doctor halves Amma's blood-pressure tablet in Thrissur, Lakshmi is unsure which tablet to give, and Priya in Bengaluru can't find the update among forty messages."],
        ["07.webp", 559, "Context by numbers: 149M Indians aged 60+ in 2022, 347M projected by 2050, and about 50% adherence to long-term medication."],
        ["08.webp", 560, "Why now: 75% of Indians aged 60+ live with a chronic disease, 53 crore people use WhatsApp in India, and the home-care market keeps growing."],
        ["09.webp", 900, "Photo spread: who Tidewell is for, an older parent, the people around her, and a plastic pillbox that runs the week."],
        ["10.webp", 768, "Research plan: five methods, each answering a different question, from interviews with adult children who organise care to home visits."],
        ["11.webp", 773, "Competitive landscape: today's options remind one patient; none supports several carers, a helper, prescription changes and WhatsApp together."],
        ["12.webp", 536, "Proto-personas: Priya, 38, the organiser in Bangalore; Lakshmi, 52, the helper in Thrissur; and Amma, the parent."],
        ["13.webp", 1000, "The three-user mental model: one medicine schedule, three relationships with it. Priya uses the app; Lakshmi and Arun only use WhatsApp."],
        ["14.webp", 760, "Journey map: anxiety rises when a prescription photo is sent to WhatsApp and the helper isn't told about the changed dose, then calms with a routine."],
        ["15.webp", 760, "Working insights: families coordinate in WhatsApp, the person giving pills never installs the app, and mistakes cluster after a dose change, so changes stay open until every carer confirms."],
        ["16.webp", 900, "How care runs today: the helper's notebook, the sibling's WhatsApp thread abroad, and Amma's own routine and memory."],
        ["17.webp", 1240, "System architecture: one schedule and one event log behind two surfaces, the Tidewell app for Priya and WhatsApp prompts and digests for Lakshmi and Arun."],
        ["18.webp", 820, "Prescription intake: Priya photographs the slip, on-device text recognition drafts drug, strength and timing, and low-confidence fields are outlined for a person to check."],
        ["19.webp", 820, "Full-bleed photo of blister strips of tablets."],
        ["20.webp", 599, "Key flow: when the doctor changes a dose, Priya snaps the prescription, Tidewell reads it, and every carer confirms the change."],
        ["21.webp", 900, "State machine: a dose change moves from captured to draft to verified and is not live until every carer has seen it; until then both doses are visible."],
        ["22.webp", 1000, "Sync and conflicts: Lakshmi logs a dose offline at 8:00 while Priya approves a lower dose at 8:05, and a timeline shows how the conflict is resolved."],
        ["23.webp", 860, "Low-fidelity wireframes: Today, Home mode, What changed and Add medicine, in grey boxes so feedback stays on the flow."],
        ["24.webp", 1786, "Graveyard of ideas: rejected concepts such as push notifications only and a smart pillbox, each failing one of the design principles."],
        ["25.webp", 1000, "Before and after: a dense medication list with overdue counts versus a plain-language Today view grouped by time."],
        ["26.webp", 1000, "Full-bleed photo: the person at the centre never touches the app; Home mode exists so her day stays simple."],
        ["27.webp", 528, "Designing for Lakshmi: Home mode for helpers on shared phones, and prescription changes that stay open until everyone taps I've seen this."],
        ["28.webp", 1240, "Text size: Home mode tested at Android's 200% text setting, with the dose card and Given button still fitting the screen."],
        ["29.webp", 1160, "Feedback spec: motion, haptics and sound for the Given button, so the phone says done without being looked at twice."],
        ["30.webp", 1000, "Error prevention: an Already given today warning stops a second person from giving the same tablet twice."],
        ["31.webp", 760, "Photo: design for the hand that gives the tablet."],
        ["32.webp", 688, "Accessibility and language: 64 px primary buttons, 18 px minimum body text, 4.5:1 contrast, and Malayalam, Hindi and English per person."],
        ["33.webp", 1064, "Resilience: TalkBack screen-reader labels for every element, and offline behaviour when there is no signal."],
        ["34.webp", 854, "Edge cases: two helpers on shifts, a helper changing her number, and other messy real-family situations, with how Tidewell handles each."],
        ["35.webp", 900, "Scene at 9:40 pm: Priya in Bangalore, Arun in Dubai and Amma at home, with the family WhatsApp group asking whether Amma took her tablet."],
        ["36.webp", 962, "Usability test plan: eight tasks across three roles, one prototype and five participants per role, with success criteria and time targets."],
        ["37.webp", 640, "How I'd measure it: zero doses given twice in a month, every carer confirming a change within 24 hours, and helpers logging a dose in under 5 seconds. Targets, not results."],
        ["38.webp", 411, "Roadmap: MVP with Today view, Home mode and change cards; v1.1 adds prescription photo suggestions and refill reminders; v2 adds a parent mode."],
        ["39.webp", 497, "Reflection: the screens were the easy part; the real design work was deciding who sees a change, when, and how it is confirmed."]
      ] } },
    { title: "Backwater Line", tag: "Information Design \u00b7 Wayfinding", color: "#0E0F10", status: "Concept project", url: "#",
      summary: "One map, one naming system and four sign types that let a first-time rider choose the right boat, from the right side, in either language.",
      case: { slug: "backwater", cover: "02.webp", sections: [   // [1× image (a 2× "@2x" file sits beside it), height px at 1440 wide, description], exported at 2× from Figma "Backwater Line v3"
        ["01.webp", 632, "Backwater Line. One map, one naming system and four sign types that let a first-time rider choose the right boat from the right side, in either language. Information design and wayfinding, 2026."],
        ["02.webp", 900, "Hero: the Backwater Line network map with lines connecting Fort Quay, Old Town, Spice Wharf, Market, Chinese Nets, North Shore, University and Central Jetty."],
        ["03.webp", 300, "Snapshot: sole designer for the research plan, network diagram, naming, sign family and pictograms; self-initiated; a fictional network referencing Kochi Water Metro; Figma."],
        ["04.webp", 1000, "Full-bleed photo: a ferry carrying scooters, autorickshaws and people in one trip."],
        ["05.webp", 562, "The human friction: handwritten timetables and jetty names that change from sign to sign leave riders unsure which of two tied-up boats is theirs."],
        ["06.webp", 4540, "Illustrated rider journey, Her first ferry: a first-time visitor in Fort Kochi with no Malayalam and one change to make, through six moments and the sign that answers each."],
        ["07.webp", 609, "The real-world reference: Kochi Water Metro, India's first water metro, opened in April 2023 and connects 10 islands."],
        ["08.webp", 1000, "Field reference: Kochi Water Metro signs already stack Malayalam, English and Hindi, and the decision point is the gangway and floating pontoon."],
        ["09.webp", 900, "Photo spread on the water: people find their way by landmarks such as the fishing nets, the market and the church. Photos by Jithu M and Avin CP on Unsplash."],
        ["10.webp", 519, "Precedents: Harry Beck's 1933 London Underground diagram, which traded true distances for order, and the lessons it gives a water network."],
        ["11.webp", 562, "Research plan: observation at two busy jetties at peak hour, interviews and other methods, with what each one answers."],
        ["12.webp", 466, "Rider personas, assumption-based: the daily commuter who knows the boat but not the network, and the first-time visitor, often English-only."],
        ["13.webp", 1083, "The wayfinding system: every sign is printed from one network source of lines, jetties and berths, so a fact that isn't in the source can't appear on a sign."],
        ["14.webp", 900, "Information layers: what each sign answers, what it shows and what it deliberately leaves out."],
        ["15.webp", 629, "Rider journey touchpoints: plan, arrive, board and ride, each with one question and the sign that answers it."],
        ["16.webp", 1000, "Full-bleed photo: the last question, where do I get off, is asked sitting down mid-river, answered by the on-board map."],
        ["17.webp", 1060, "The walk to the berth: a Fort Kochi street that ends at the water, and the yellow-banded posts already used as a colour cue on the waterfront."],
        ["18.webp", 760, "Before and after: a geographically accurate map nobody could use, and the diagram with only 0, 45 and 90 degree lines, open-ring interchanges and letters as well as colours."],
        ["19.webp", 1950, "Graveyard of ideas: rejected options such as numbered lines, which clash with boat numbers, and colour-only lines."],
        ["20.webp", 452, "Key decisions: a diagram that keeps the water in, Malayalam and English at equal size and weight, and journey times in minutes on the next-boat board."],
        ["21.webp", 1000, "Naming and bilingual typesetting: one name and code per jetty, transliterated rather than translated, such as Central Jetty in English and Malayalam."],
        ["22.webp", 900, "Signage: the Central Jetty sign family with destinations to Eastbank, Fort Quay and North Shore in English and Malayalam."],
        ["23.webp", 857, "Sign placement plan for Central Jetty: a jetty totem at the street entrance, a ticket pictogram by the machine and direction blades over each berth."],
        ["24.webp", 1160, "Live information: the next-boat board in every state, from boarding now to minutes away, delayed and suspended, each with a word and a shape."],
        ["25.webp", 799, "Colour-blind check: the line colours simulated for deuteranopia, with adjusted values so every line stays distinct."],
        ["26.webp", 440, "Pictograms on a 48-unit grid with a 4-unit stroke: ferry, market, fishing nets, accessible, tickets and timetable."],
        ["27.webp", 704, "Pictogram construction: a 48-unit canvas with a 4-unit safe area, 4-unit strokes with round caps and a 2-unit minimum gap."],
        ["28.webp", 1000, "Legibility maths: about one inch of letter height for every ten feet of viewing distance, applied to each sign's reading distance."],
        ["29.webp", 900, "After dark: every sign specified as internally lit; on black, the yellow line reads strongest at 11.5:1 and the blue needed a lighter tint."],
        ["30.webp", 1200, "Environment and accessibility: matte non-glare faces, marine-grade aluminium for rain and salt air, and design for riders with different needs."],
        ["31.webp", 1100, "Edge cases: high water closing a jetty, a power cut at the jetty and other water-transit failures, with how the system handles each."],
        ["32.webp", 1000, "Full-bleed photo: the Fort Kochi Water Metro station beside the Chinese fishing nets, the landmark riders actually navigate by."],
        ["33.webp", 760, "Photo of the backwaters: signs have to work in glare, rain and at the speed of a boat."],
        ["34.webp", 458, "How I'd measure it: under 10 seconds to find the line for a named landmark, under 30 seconds to plan a trip with one change, and no wrong-side boardings. Targets, not results."],
        ["35.webp", 837, "Test plan: tasks such as finding the line to the Chinese Nets, with what success looks like and how it is measured."],
        ["36.webp", 388, "Roadmap: a pilot at two jetties, then a live-arrival mobile view, and later tactile maps, audio wayfinding and a sign manual."],
        ["37.webp", 860, "Full-bleed photo of the fishing nets at dusk."],
        ["38.webp", 497, "Reflection: accuracy is not the same as clarity, and a sign is only as good as the data behind it."]
      ] } },
    { title: "Ekmaati", tag: "Branding \u00b7 Packaging", color: "#2A1A10", status: "NID Semester 2 project", url: "#",
      summary: "Brand identity, naming and temple-form packaging for the GI-tagged clay Ganesh idols of Pen.",
      case: { slug: "ekmaati", cover: "13.webp", sections: [   // [1× image (a 2× "@2x" file sits beside it), height px at 1440 wide, description], exported at 2× from Figma "ekmaati final"
        ["01.webp", 1000, "Ekmaati. Brand identity, naming and temple-form packaging for the GI-tagged clay Ganesh idols of Pen. Branding, 2026."],
        ["02.webp", 240, "Snapshot: sole designer for research, naming, identity, packaging and campaign; deliverables include the name, mark, colour, type, temple box, die line and two posters; a real project, prototyped by hand."],
        ["03.webp", 960, "Statement: turning a seasonal commodity into a keepsake, with a name, a mark and a temple-shaped box for the clay gods of Pen."],
        ["04.webp", 529, "The human friction: a family brings home a hand-made river-clay idol in bubble wrap and tape; the missing pieces were a name, an identity and a box."],
        ["05.webp", 1000, "Sold by the row: intricate river-clay idols from a GI-registered craft, sold like a seasonal commodity without a name or a maker."],
        ["06.webp", 620, "Why it matters: Pen Ganesh idols got a Geographical Indication in 2024, plaster-of-Paris idols were banned in 2020, and the box must survive the monsoon."],
        ["07.webp", 1300, "Research: how I got to the clay, a process curve from research and definition to design and making."],
        ["08.webp", 1100, "One clay: Ek maati means one clay in Marathi, the river clay every idol is made from, linking river, clay, hands and home."],
        ["09.webp", 691, "Naming: three routes, Penkara, Clay and Shrine, and Ekmaati, judged against faith, uniqueness and the buyer's language."],
        ["10.webp", 593, "Four design principles: from the clay, faith first, keep don't discard, and small places."],
        ["11.webp", 1200, "The mark: three strokes and a tilak, with a red tilak, two curved ears and a trunk drawn as one brushstroke, also reading as a person at prayer."],
        ["12.webp", 274, "The mark at size: the logo shown from 96 px down to 16 px, with a proposed minimum of 24 px on screen and 10 mm in print."],
        ["13.webp", 1080, "Logo system: the primary lockup on snow and the mark on earth and robe backgrounds, with clear space and minimum size rules."],
        ["14.webp", 1033, "River lines brand asset: offset contour loops based on a riverbed, shown on snow, earth, gold and robe, with construction notes."],
        ["15.webp", 1101, "Colour from the festival: Gold Fusion from marigold garlands, Sindoor for the tilak only, and Monk's Robe from wet river earth, with contrast ratios."],
        ["16.webp", 921, "Type shaped by hand: fourteen typefaces explored, with MV Boli for the wordmark and Anek Devanagari for Marathi."],
        ["17.webp", 1702, "Process hall of fame: logo iterations, three cardboard box prototypes, die lines and materials that led to the final box."],
        ["18.webp", 891, "Decision log: what was chosen, what was let go and why, for the name, mark, colour, type and box."],
        ["19.webp", 1300, "The temple box: a box that folds from flat sheets into a body, two roof tiers and a peak, with no tape or plastic; 350 GSM board, gold emboss and spot UV."],
        ["20.webp", 4399, "Illustrated narrative, The Festival Errand: a buyer picks a small Pen idol in a temple-shaped box, tears the arch at home, and keeps the temple after immersion."],
        ["21.webp", 834, "Experience map: the errand mapped from the stall to carrying it home, tearing the arch, the ten days of worship and immersion."],
        ["22.webp", 761, "Accessibility and edge cases: Marathi and English at equal weight, measured contrast and no reliance on colour, plus edge cases such as monsoon damp."],
        ["23.webp", 978, "Campaign, Big faith for small places: posters showing a detailed Ganesha on a desk among keyboards, glasses and sticky notes."],
        ["24.webp", 725, "Validation: how I'd know it works, including an unboxing test with five people and whether buyers keep the box as a shrine."],
        ["25.webp", 466, "Reflection: cardboard prototypes taught more than renders; next is co-designing the box with an artisan family in Pen and testing the unboxing."],
        ["26.webp", 1001, "Back to the water: the clay idol returns to water while the temple box stays."],
        ["27.webp", 1100, "Footer: Ekmaati, branding and packaging, Semester 2 jury at NID, 2026, with role, sources and credits."]
      ] } }
  ],

  skills: [
    { group: "Product Design",    items: ["UX research", "Interaction design", "UI systems", "Prototyping", "Usability testing"] },
    { group: "Brand Strategy",    items: ["Positioning", "Brand identity", "Naming & voice", "Campaigns", "Guidelines"] },
    { group: "Experience Design", items: ["Service design", "Journey mapping", "Spatial / exhibit", "Workshops"] },
    { group: "3D & Motion",       items: ["Blender", "Spline", "Cinema 4D", "Three.js / WebGL", "KeyShot", "After Effects"] },
    { group: "Tools",             items: ["Figma", "Adobe CC", "Framer", "Protopie", "Notion"] }
  ],

  experience: []   // ✏️ add real roles: { company, role, from, to } — the Resume window hides the list while it's empty
};
