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

  // Featured work — case studies exported from Figma (page "Case Study v2 · Web" in each file).
  // `case.sections` are images in work/<slug>/; `color` tints the card while the cover loads.
  projects: [
    { title: "Tidewell", tag: "UX / Product Design", color: "#0F3B38", status: "Concept project", url: "#",
      summary: "A calm medication-coordination app for families who share the care of an ageing parent across cities.",
      case: { slug: "tidewell", cover: "02.webp", sections: [   // [1× image (a 2× "@2x" file sits beside it), height px at 1440 wide, description] from Figma "Case Study v2 · Web", exported at 2×
        ["01.webp", 671, "Tidewell. A calm medication-coordination app for families who share the care of an ageing parent across cities. UX / Product Design, Android app + WhatsApp, 2026, concept project."],
        ["02.webp", 1031, "Three phone screens: Home mode for the helper, Amma's Today view (on track, 3 of 5 doses given), and What changed, where a dose change waits until every carer confirms."],
        ["03.webp", 1000, "A morning at home: the newspaper, the 8 am tablet, and family in other cities who want to know it was taken."],
        ["04.webp", 593, "The problem: care for an ageing parent is shared across siblings, cities and a home helper. Prescriptions arrive on paper, updates fly through WhatsApp, and nobody is sure the evening dose was given."],
        ["05.webp", 559, "149M Indians aged 60+ in 2022, 347M by 2050 (UNFPA). About 50% adherence to long-term therapy (WHO). 18M Indians live abroad (UN DESA)."],
        ["06.webp", 900, "Who Tidewell is for: an older parent, the people around her, and a plastic box that runs the week."],
        ["07.webp", 768, "Research plan: interviews with organisers and helpers, home visits, a diary study of one family's WhatsApp group, and a card sort."],
        ["08.webp", 773, "Competitive landscape: Medisafe, phone alarms, WhatsApp groups and paper prescriptions compared with Tidewell on carers, helpers, prescription changes and WhatsApp."],
        ["09.webp", 536, "Proto-personas: Priya, the organiser in Bangalore; Lakshmi, the helper in Thrissur; Amma, 78, the parent."],
        ["10.webp", 760, "Journey map: anxiety spikes at hand-offs, when a dose changes and the helper isn't told, not during routines."],
        ["11.webp", 760, "Working insights: families coordinate in WhatsApp; the person giving pills never downloads the app; mistakes cluster after dose changes; children far away feel guilt, not curiosity."],
        ["12.webp", 900, "How care runs today: the helper's notebook, the sibling's WhatsApp, and Amma's own routine."],
        ["13.webp", 820, "A full-bleed photo of blister strips of tablets."],
        ["14.webp", 599, "Key flow: when the doctor changes a dose, everyone finds out and confirms, from paper prescription to a closed change card."],
        ["15.webp", 860, "Low-fidelity wireframes: Today, Home mode, What changed, Add medicine."],
        ["16.webp", 1000, "Before and after: a dense medication list versus a plain-language status, grouped by time, showing who gave each dose."],
        ["17.webp", 528, "Home mode: one dose at a time, a photo of the actual tablet, and one button as big as a thumb."],
        ["18.webp", 760, "Design for the hand that gives the tablet."],
        ["19.webp", 688, "Accessibility and language: 64 px buttons, 18 px minimum text, Malayalam, Hindi and English, 4.5:1 contrast, offline logging, TalkBack labels."],
        ["20.webp", 900, "9:40 pm: an illustrative WhatsApp thread where the family can't agree whether Amma took her BP tablet."],
        ["21.webp", 750, "Usability test plan: five participants, five tasks, one prototype."],
        ["22.webp", 640, "Success targets for a one-month pilot: zero doses given twice, every carer confirms a change within 24 hours, a helper logs a dose in under 5 seconds."],
        ["23.webp", 411, "Roadmap: MVP, v1.1 and v2."],
        ["24.webp", 452, "Reflection: accurate isn't the same as reassuring."],
        ["25.webp", 298, "Sources and photo credits."]
      ] } },
    { title: "Ledgerly", tag: "UI \u00b7 Design Systems", color: "#2F3BEA", status: "Concept project", url: "#",
      summary: "A cash-first invoicing dashboard for freelancers and small studios, and the token-based design system behind it.",
      case: { slug: "ledgerly", cover: "02.webp", sections: [   // [1× image (a 2× "@2x" file sits beside it), height px at 1440 wide, description] from Figma "Case Study v2 · Web", exported at 2×
        ["01.webp", 680, "Ledgerly. A cash-first invoicing dashboard for freelancers and small studios, and the token-based design system behind it. UI Design and Design Systems, responsive web app, 2026, concept project."],
        ["02.webp", 908, "The light-mode dashboard: cash in bank today with runway in months, expected payments, overdue clients and a 90-day cash forecast."],
        ["03.webp", 1000, "Who it's for: people paid per project, and the invoices they send every month."],
        ["04.webp", 601, "The problem: invoicing tools show revenue, but freelancers worry about cash."],
        ["05.webp", 558, "7.7M gig workers in India in 2020 to 21, 23.5M projected by 2029 to 30, 4.1% of the workforce, 22% high-skilled (NITI Aayog, 2022)."],
        ["06.webp", 900, "Freelancers invoice from café tables and kitchen counters, often on a phone."],
        ["07.webp", 708, "Research plan: UI audit, survey, interviews and a first-click test."],
        ["08.webp", 688, "Landscape: accounting suites, invoice generators, spreadsheets and bank apps, and what each misses."],
        ["09.webp", 536, "Proto-personas: Meera, a freelance illustrator; Arjun, a two-person studio; Divya, their accountant."],
        ["10.webp", 900, "Today's system: a folder, a spreadsheet and a reminder on the phone."],
        ["11.webp", 880, "The dark-mode dashboard: one set of semantic tokens re-mapped switches the whole screen."],
        ["12.webp", 556, "Key decision: one hero number, cash translated into time."],
        ["13.webp", 540, "Key flow from invoice to cash: create, send, gentle reminder, client pays, auto-matched, forecast updates."],
        ["14.webp", 659, "Information architecture: cash on the first screen, tax under Reports."],
        ["15.webp", 620, "Colour tokens: an indigo ramp and status colours in soft and strong pairs."],
        ["16.webp", 760, "Type scale in Google Sans Flex at a 1.2 ratio, and a 4 px spacing scale."],
        ["17.webp", 759, "Token architecture: primitive, semantic and component layers; dark mode re-maps only the semantic layer."],
        ["18.webp", 640, "Every component ships with every state: default, hover, pressed, focus and disabled."],
        ["19.webp", 740, "Component inventory: 24 components with states, tokens and do and don't rules."],
        ["20.webp", 900, "Key decision: on phones, a squeezed table becomes a card with the same data."],
        ["21.webp", 756, "Three breakpoints, one component set: 360, 768 and 1280 px."],
        ["22.webp", 567, "Contrast checks: every text pair passes WCAG AA, from 5.6:1 to 18:1, in light and dark mode."],
        ["23.webp", 760, "Month end shouldn't need a calculator."],
        ["24.webp", 900, "The work behind the invoice."],
        ["25.webp", 600, "What the system makes possible: three new screens with zero new components."],
        ["26.webp", 615, "Usability test plan: five tasks with success criteria and measures."],
        ["27.webp", 411, "Roadmap: MVP, v1.1 and v2."],
        ["28.webp", 256, "Sources and photo credits."]
      ] } },
    { title: "Backwater Line", tag: "Information Design \u00b7 Wayfinding", color: "#0E0F10", status: "Concept project", url: "#",
      summary: "A network map, pictograms and bilingual signage that make a city's ferry routes readable at a glance.",
      case: { slug: "backwater", cover: "02.webp", sections: [   // [1× image (a 2× "@2x" file sits beside it), height px at 1440 wide, description] from Figma "Case Study v2 · Web", exported at 2×
        ["01.webp", 632, "Backwater Line. A network map, pictograms and bilingual signage that make a city's ferry routes readable at a glance. Information design and wayfinding, 2026, concept project with a fictional network."],
        ["02.webp", 900, "The network map: three lines across islands and jetties, labelled in English and Malayalam."],
        ["03.webp", 1000, "A ferry carries scooters, autorickshaws and people in one trip."],
        ["04.webp", 528, "The problem: ferries are fast, but handwritten timetables and inconsistent jetty names keep riders away."],
        ["05.webp", 609, "The real-world reference: Kochi Water Metro, opened 2023, 10 islands, 78 boats planned, 5M passengers in 29 months."],
        ["06.webp", 900, "People find their way by landmarks: the nets, the market, the church spire."],
        ["07.webp", 519, "Precedent: Harry Beck's 1933 London Underground diagram."],
        ["08.webp", 562, "Research plan: jetty observation, rider intercepts, a sign audit and a map test."],
        ["09.webp", 466, "Rider personas: the commuter, the visitor and the older rider."],
        ["10.webp", 629, "Rider journey: every moment of the trip has one question and one sign that answers it."],
        ["11.webp", 1060, "The walk from the street to the boat."],
        ["12.webp", 760, "Before and after: a geographic map versus a diagram with 0, 45 and 90 degree lines."],
        ["13.webp", 452, "Key decisions: keep the water in; Malayalam and English at equal size."],
        ["14.webp", 900, "Signage: the jetty totem, direction blades and the next-boat board."],
        ["15.webp", 857, "Sign placement plan for Central Jetty."],
        ["16.webp", 799, "Colour-blind check: lines simulated for deuteranopia; every line also carries a letter."],
        ["17.webp", 440, "Pictograms on a 48-unit grid: ferry, market, fishing nets, accessible, tickets, timetable."],
        ["18.webp", 704, "Pictogram construction: canvas, stroke, gaps and smallest size."],
        ["19.webp", 560, "Type sizes by viewing distance, from 120 mm at 20 m to 6 mm at 1 m."],
        ["20.webp", 900, "After dark: lit signs; yellow on black 11.5:1, blue on black 5.7:1."],
        ["21.webp", 760, "Signs have to work in glare, rain and at the speed of a boat."],
        ["22.webp", 600, "How I'd measure it: under 10 seconds to find a line, under 30 seconds to plan a trip, zero wrong-side boardings."],
        ["23.webp", 507, "Test plan: four tasks with success criteria."],
        ["24.webp", 388, "Roadmap: pilot, next and later."],
        ["25.webp", 860, "Chinese fishing nets at dusk."],
        ["26.webp", 452, "Reflection: accuracy is not the same as clarity."],
        ["27.webp", 277, "Sources and photo credits."]
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
