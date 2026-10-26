# Content for the sections added to Carekin and Syntra in v200 (Sijo's portfolio review: how I found the problem, proof it is
# wider than one family or store, whether it is worth solving as a business, detailed personas, a whiteboard from symptoms to
# root cause, research-to-decision mapping, designing for the extremes, and how I made it with which tools and AI).
# Each section: id (file name), after (existing file it follows), bg, blocks. build.py renders both the designed image and the
# text version from this. Every number has its source in the section. No invented quotes or research.

CAREKIN = [
  dict(id="k-origin", after="04.webp", bg="light", desc="How I found the problem: I talked with family carers and asked them to walk me through the last time a dose changed. Four stories came back: the prescription photo nobody confirms, the helper who finds out last, calls from children far away, and the same dose given twice.", blocks=[
    ("head", "How I found the problem", "It started with families, not with an app idea.",
     "I talked with family carers, people looking after a parent’s medicines from the same house or another city. I didn’t ask what app they wanted. I asked them to walk me through the last time a dose changed."),
    ("cards", 4, [
      ("What I heard · 01", "The photo nobody confirms", "A new prescription arrived as a WhatsApp photo. Everyone assumed someone else had read it."),
      ("What I heard · 02", "The helper finds out last", "The person who actually gives the tablets heard about a change days later, or not at all."),
      ("What I heard · 03", "Calls from far away", "Children in other cities called home to ask if Amma had taken it, and felt guilty when no one knew."),
      ("What I heard · 04", "The same dose, twice", "With two people helping, a dose was sometimes given twice, because nothing showed it was already given.")]),
    ("band", "Then I checked it wasn’t just them", "Published research with family carers says the same, in numbers and in their own words. That is the next section."),
  ]),
  dict(id="k-business", after="17.webp", bg="mint", desc="Is it worth solving: the cost (57.8% of family carers made a medication error in the past year; only about half of Indians with chronic illness take medicines as prescribed, WHO SAGE wave 2), the market (India's home healthcare market from $12.0 billion in 2025 to $18.8 billion in 2030, MarketsandMarkets), who pays (free for families, paid by home-care agencies), how I will validate it and the risks.", blocks=[
    ("head", "Is it worth solving?", "A real cost, a growing market, and a clear buyer.",
     "A painful problem isn’t automatically a business. I looked at who loses what, who already spends money on care, and who would pay for this."),
    ("cards", 3, [
      ("The cost", "Wrong or missed doses", "57.8% of family carers made a medication error in the past year. Among Indians with chronic illness, only about half take their medicines as prescribed.", "WHO SAGE wave 2, secondary analysis of 2,840 patients"),
      ("The market", "$12.0B → $18.8B", "India’s home healthcare market from 2025 to 2030. 149 million Indians were 60 or older in 2022.", "MarketsandMarkets, 2025"),
      ("Who already pays", "Care is paid for. Coordination isn’t.", "Families already pay for helpers, home nurses and medicine delivery. Keeping everyone on the same plan is the part nobody sells.")]),
    ("cards", 3, [
      ("Who pays, my hypothesis", "Free for families, paid by care providers", "Free for a family with one helper. A paid plan when more people share care. The bigger buyer: home-care agencies, whose helpers log every dose a family can see."),
      ("How I’ll validate it", "Three tests, each with a pass mark", "1  Five families use it for two weeks with no dose given twice.\n2  Those families are asked to pay for month two.\n3  One home-care agency pilot: do families trust them more?"),
      ("The risk", "Families may not pay for software", "That is why the agency route matters. WhatsApp message costs also have to stay low for a free family plan.")]),
    ("verdict", "My answer: worth solving, most likely paid for by care providers, with families using it free."),
  ]),
  dict(id="k-persona", after="18.webp", replaces="18.webp", bg="light", desc="Personas, built from my conversations with family carers and published research: Priya, 38, the organiser in Bengaluru; Lakshmi, 52, the helper at home in Thrissur; Amma, 78, the parent; Arun, 41, the son in Dubai. For each: a day, goals, frustrations, what they won't accept and what Carekin must do. Composites with fictional names.", blocks=[
    ("head", "Personas", "Four people around one parent.",
     "Built from my conversations with family carers and from published research. Each is a composite; the names are fictional."),
    ("personas", [
      ("P", "#0F3B38", "Priya, 38 · the organiser", "Bengaluru · IT manager · visits home every other month", [
        ("A day", "Checks the family chat between meetings, orders refills, calls the doctor’s clinic."),
        ("Goals", "Certainty, in one glance, that today’s doses happened."),
        ("Frustrations", "Hearing about a mistake days later; being the only one who knows the plan."),
        ("Won’t accept", "Another app the rest of the family won’t open."),
        ("Carekin must", "Let her change a dose once and know every carer has seen it.")]),
      ("L", "#FF8A6B", "Lakshmi, 52 · the helper", "Thrissur · lives in · reads Malayalam · shares a phone", [
        ("A day", "Cooks, gives Amma her tablets at 8, 1 and 8, keeps a notebook."),
        ("Goals", "One clear thing to do, at the right time."),
        ("Frustrations", "Being blamed for a change nobody told her about."),
        ("Won’t accept", "English menus, small text, a new app on a shared phone."),
        ("Carekin must", "Send each dose on WhatsApp, in Malayalam, with a photo of the tablet and one button.")]),
      ("A", "#5B8C7F", "Amma, 78 · the parent", "Thrissur · five tablets a day · proud of managing herself", [
        ("A day", "Newspaper, temple, her serials; takes the tablets when Lakshmi brings them."),
        ("Goals", "Stay independent, not be treated like a patient."),
        ("Frustrations", "Three children asking her the same question."),
        ("Won’t accept", "Alarms, and being watched."),
        ("Carekin must", "Work around her, without her ever touching the app.")]),
      ("A", "#7EB8A9", "Arun, 41 · the son abroad", "Dubai · long hours · calls home twice a week", [
        ("A day", "Reads the family chat at night, Indian time."),
        ("Goals", "Know Amma is fine without calling to check."),
        ("Frustrations", "Guilt, and different answers from different people."),
        ("Won’t accept", "Alerts at 3 am about things he can’t act on."),
        ("Carekin must", "Send a calm weekly note, and a nudge only when he is needed.")])]),
  ]),
  dict(id="k-whiteboard", after="22.webp", bg="mint", desc="Whiteboard: what families told me on sticky notes, five whys down to the root cause (there is no single plan everyone shares, so every change depends on one person passing it on), a how-might-we question, four ideas, and three crossed-out ideas (a pill reminder app, a smart pillbox, a chatbot in the family group) with why.", blocks=[
    ("head", "Whiteboard", "How I got from symptoms to the root cause.",
     "I put every story on one board, asked “why” until the answer stopped being about one careless person, and only then looked for ideas. Ideas that broke what families told me were crossed out."),
    ("wb", dict(
      saw=["New prescription = a WhatsApp photo nobody confirms", "Helper never told about the dose change", "Brother in Dubai calls: “did Amma take it?”", "Evening dose given twice", "Helper shares a phone, reads Malayalam"],
      whys=["A wrong dose is given.", "The helper had the old plan.", "The change lived in Priya’s head and a photo.", "Nothing shows who has seen a change.", "There is no single plan everyone shares."],
      root="Every change depends on one person passing it on.",
      hmw="…make a dose change reach every carer, and stay open until each one has seen it?",
      ideas=["One plan, seen three ways", "The helper stays on WhatsApp, one button", "A change stays open until all confirm", "“Already given” stops a second dose"],
      dead=[("A pill reminder app", "reminds one patient, not a family"), ("A smart pillbox", "costly, and the helper still isn’t told"), ("A bot in the family group", "no single source of truth")])),
  ]),
  dict(id="k-map", after="k-whiteboard", bg="light", desc="From what I heard to what I designed: families won't leave WhatsApp, so the helper gets doses there; the helper never downloads the app, so Home mode has one button; mistakes cluster after a dose change, so a change stays open until every carer confirms; children far away feel guilt, so Today leads with one calm sentence; the helper reads Malayalam on a shared phone, so Malayalam and 200% text; two people gave the same dose, so an Already given warning.", blocks=[
    ("head", "From what I heard to what I designed", "Every decision traces back to a family.",
     "Nothing in Carekin is there because it looked good. Each choice answers something a family told me."),
    ("map", [
      ("I heard", "Families coordinate in WhatsApp and won’t leave it.", "The helper gets every dose on WhatsApp; only Priya uses the app."),
      ("I heard", "The person giving pills never downloads an app.", "Home mode: one dose, one big button, on a shared phone."),
      ("I heard", "Mistakes happen right after the doctor changes a dose.", "A change stays open until every carer has confirmed it."),
      ("I heard", "Children far away feel guilt, not curiosity.", "Today opens with one calm sentence, not a list."),
      ("I heard", "The helper reads Malayalam and shares a phone.", "Malayalam throughout, and layouts that hold at 200% text."),
      ("I heard", "Two people sometimes gave the same dose.", "“Already given at 8:04” stops a second dose.")]),
  ]),
  dict(id="k-extremes", after="40.webp", bg="mint", desc="Designing for the highs and lows: discharge day with eight new medicines, Amma travelling for a festival, months of nothing changing, Amma refusing a tablet, the helper's phone offline, and two people reaching for the same dose, with what Carekin does in each.", blocks=[
    ("head", "Designing for the highs and lows", "The hardest days decide if a family trusts it.",
     "A normal Tuesday is easy. I designed for the busiest and the worst days too, because that is when a family decides whether to keep using it."),
    ("xt", [
      ("high", "High · discharge day", "Home from hospital with eight new medicines", "Priya scans the discharge sheet once. Each change stays open until Lakshmi and Arun confirm; Lakshmi gets doses one at a time, not a list."),
      ("high", "High · festival travel", "Amma spends Onam in Bengaluru", "The plan moves with Amma: Priya gives the doses for those days and Lakshmi’s prompts pause."),
      ("low", "Low · nothing changes", "Months of the same routine", "Carekin goes quiet: one calm weekly note, no daily noise."),
      ("low", "Low · a refusal", "Amma won’t take the evening tablet", "Logged as “Not given · Amma refused”, with one calm summary to Priya, not an alarm."),
      ("worst", "Worst · no signal", "Lakshmi’s phone is offline", "She logs the dose anyway; it syncs later, and a clash with a new dose is shown, never guessed."),
      ("worst", "Worst · two givers", "Two people reach for the same dose", "“Already given at 8:04, by Lakshmi” stops the second one.")]),
  ]),
  dict(id="k-tools", after="43.webp", bg="dark", desc="How I made it: conversations with family carers, published research and a FigJam board; AI to sort my notes into themes and check copy, checked against what families said; every screen, the design system, the prototype and the walkthrough made by me in Figma; scenario illustrations AI-generated in my style.", blocks=[
    ("head", "How I made it", "Where I used AI, and where I didn’t.",
     "I designed Carekin alone, in two weeks. Every screen is mine; AI helped with the work around the design."),
    ("cards", 4, [
      ("Research", "People first", "Conversations with family carers, published research with carers in Kerala, and a FigJam board where I sorted it all."),
      ("AI for synthesis", "Sorting, not deciding", "I used AI to group my notes into themes and check my copy, then checked every theme against what families told me."),
      ("Design", "Figma, by me", "Every screen, the design system, the prototype and the walkthrough are my own work."),
      ("Visuals", "AI, in my style", "The scenario illustrations are AI-generated in my style. The phone screens are the real prototype.")]),
  ]),
]

SYNTRA = [
  dict(id="k-hook", after="01.webp", bg="hook", desc="The hook: find a perfume by feeling, then step inside it and take it home. VR on a Meta Quest 3 with nine 360-degree worlds, from a starry lake to snowy Alps; a printed thermal ticket with your scent's drawing that comes alive in AR when you scan it at home. 66 tickets printed at our exhibit in one day.", blocks=[
    ("hook",)]),
  dict(id="k-persona", after="06.webp", bg="cream", desc="Personas, built from our store visits and my conversations with people choosing perfume: Ananya, 22, buying her first perfume; Rahul, 31, buying a gift in ten minutes; Farah, 44, who wants a change after years of one scent. For each: who they are, goals, frustrations, what they won't accept and what Syntra must do. Composites with fictional names.", blocks=[
    ("head", "Personas", "Three shoppers, one wall of bottles.",
     "Built from our store visits and my conversations with people choosing perfume. Each is a composite; the names are fictional."),
    ("personas", [
      ("A", "#DD8020", "Ananya, 22 · her first perfume", "Design student · shops with friends · knows moods, not notes", [
        ("Goals", "A scent that feels like her, at a price she can afford."),
        ("Frustrations", "After three paper strips everything smells the same."),
        ("Won’t accept", "Being pushed towards the most expensive bottle."),
        ("Syntra must", "Let her describe a mood and trust the match.")]),
      ("R", "#9C5410", "Rahul, 31 · buying a gift", "Works long hours · ten minutes in the store", [
        ("Goals", "A safe gift that doesn’t feel generic."),
        ("Frustrations", "No idea where to start, and staff are busy."),
        ("Won’t accept", "A long quiz or a sales pitch."),
        ("Syntra must", "Get him to one confident answer, fast.")]),
      ("F", "#C9A27A", "Farah, 44 · wants a change", "Loyal to one scent for years", [
        ("Goals", "Something new for evenings that still feels like her."),
        ("Frustrations", "Can’t explain what she likes beyond “not too sweet”."),
        ("Won’t accept", "Being rushed."),
        ("Syntra must", "Help her explore, and remember what she found.")])]),
  ]),
  dict(id="k-business", after="k-persona", bg="light", desc="Is it worth solving: 60% of US perfume users discover new fragrances by trying them in store and 88% say the scent decides the purchase (Premium Beauty News); India's fragrance market is projected to double from about $2 billion to $4.08 billion by 2030 (Newsbytes); who pays (the brand, for flagship stores), how I would validate it (66 tickets at our exhibit in one day, then a four-week store test and ticket scans at home) and the risk.", blocks=[
    ("head", "Is it worth solving?", "Choosing is where the sale is won or lost.",
     "People enjoying a kiosk isn’t enough. I asked whether a store would pay for it, and how I would know."),
    ("cards", 3, [
      ("The cost", "Shoppers leave undecided", "Testing tires the nose after a few scents, and staff can’t guide everyone. An undecided shopper is a lost sale."),
      ("Proof it matters", "60% discover in store", "60% of perfume users find new fragrances by trying them in store, and 88% say the scent itself decides the purchase.", "US perfume user survey, via Premium Beauty News"),
      ("The market", "$2B → $4.08B", "India’s fragrance market, projected to double by 2030, with younger buyers leading.", "Newsbytes, 2025")]),
    ("cards", 3, [
      ("Who pays, my hypothesis", "The brand, store by store", "Syntra is a fixture, like a display: bought for flagship stores and judged on what it sells."),
      ("How I’ll validate it", "Signals, then a store test", "1  At our exhibit: 66 tickets printed in one day.\n2  One store for four weeks: do kiosk users buy more often?\n3  How many tickets are scanned at home?"),
      ("The risk", "Hardware costs money", "Each kiosk has to sell enough to pay for itself, so flagship stores first, not every store.")]),
    ("verdict", "My answer: worth testing in flagship stores, where discovery decides the sale."),
  ]),
  dict(id="k-whiteboard", after="k-business", bg="cream", desc="Whiteboard: what I saw in stores and heard from shoppers on sticky notes, five whys down to the root cause (stores speak in notes and names, people think in feelings and memories), a how-might-we question, four ideas, and three crossed-out ideas (a phone quiz, a chatbot, more testers) with why.", blocks=[
    ("head", "Whiteboard", "How I got from symptoms to the root cause.",
     "I put what I saw in stores and heard from shoppers on one board, asked “why” until the answer stopped being about one shopper, and only then looked for ideas."),
    ("wb", dict(
      saw=["“Something fresh, for evenings”, never a note name", "Paper strips everywhere; the nose gives up after three", "Staff busy, shoppers leave without buying", "Bottle chosen by its label, not its scent", "“I forgot the name by the time I got home”"],
      whys=["Shoppers leave without buying.", "They can’t find a scent that matches.", "They describe moods; the shelf describes notes.", "Testing tires them; staff aren’t free.", "Nothing turns a feeling into a scent."],
      root="Stores speak in notes and names; people think in feelings and memories.",
      hmw="…let someone find a perfume by describing a feeling, and remember it after they leave?",
      ideas=["A knob and sliders: a feeling you can play", "A screen that names the match", "VR: feel the scent as a place", "A ticket with AR: take it home"],
      dead=[("A phone quiz", "no fun, nothing to touch"), ("A chatbot", "typing a feeling is hard"), ("More testers", "more nose fatigue")])),
  ]),
  dict(id="k-map", after="k-whiteboard", bg="light", desc="From what I heard to what I designed: people know the mood, not the notes, so a mood knob; too many choices, so one match with how close it is; the nose tires, so choose by feeling first; staff aren't free, so a self-serve kiosk; a scent is remembered as a place, so VR worlds; people forget the name, so a printed ticket that comes alive in AR.", blocks=[
    ("head", "From what I heard to what I designed", "Every choice traces back to a shopper.",
     "Each part of Syntra answers something I saw in a store or heard from someone choosing perfume."),
    ("map", [
      ("I heard", "People know the mood, not the notes.", "A mood knob, not a list of notes."),
      ("I heard", "Too many choices, too few answers.", "One match, with how close it is."),
      ("I saw", "The nose tires after three strips.", "Choose by feeling first; smell only the match."),
      ("I saw", "Staff aren’t free to help everyone.", "A self-serve kiosk anyone can play."),
      ("I heard", "A scent is remembered as a place.", "Step inside the scent in VR."),
      ("I heard", "I forget the name by the time I’m home.", "A printed ticket that comes alive in AR.")]),
  ]),
  dict(id="k-extremes", after="13.webp", bg="cream", desc="Designing for the highs and lows: a queue at the exhibit, three friends at one kiosk, one shy visitor with no staff, a match that doesn't feel right, the printer out of paper and a dead VR headset, with what Syntra does in each. Some were built for the exhibit; the rest are how I would handle them in a store.", blocks=[
    ("head", "Designing for the highs and lows", "A rush, an empty floor and a broken printer.",
     "A kiosk is judged on its busiest and worst moments. Some of these I built for the exhibit; the rest are how I’d handle them in a store."),
    ("xt", [
      ("high", "High · a queue", "A crowd at the exhibit", "One turn of the knob and the sliders gives a match straight away; VR stays optional, so the line keeps moving."),
      ("high", "High · friends together", "Three people at one kiosk", "Every turn shows on screen at once, so friends compare, and each prints their own ticket."),
      ("low", "Low · no staff", "One shy visitor, nobody around", "The idle screen invites a turn; nothing needs explaining."),
      ("low", "Low · not quite right", "The match doesn’t feel like them", "A small turn gives the next closest scent, without starting again."),
      ("worst", "Worst · no paper", "The ticket can’t print", "The screen shows a code to save the result to a phone instead."),
      ("worst", "Worst · no headset", "VR isn’t available", "VR is skipped; the match and the ticket still work.")]),
  ]),
  dict(id="k-tools", after="14.webp", bg="dark", desc="How I made it, with my team and with AI: a team of three, my parts the interaction and screens, the nine VR worlds and the ticket with its AR; Arduino IDE on an ESP32 for the knob, sliders and button; Unity for the Meta Quest 3 worlds; AI to help write the ESP32 and app code and to make images and ticket drawings; Figma for screens, the manual and this documentation.", blocks=[
    ("head", "How I made it", "With my team, and with AI where it helped.",
     "Syntra was a team of three. My parts: the interaction and screens, the nine VR worlds, and the ticket with its AR."),
    ("cards", 4, [
      ("Hardware", "Arduino + ESP32", "The knob, three sliders and the button, programmed in the Arduino IDE on an ESP32."),
      ("VR", "Unity for Quest 3", "Nine 360° worlds built in Unity for the Meta Quest 3."),
      ("AI", "Code and images", "AI helped me write the ESP32 and app code, and make images and the ticket drawings. The interaction and every choice are mine."),
      ("Design", "Figma", "The screens, the printed manual and this documentation.")]),
  ]),
]
