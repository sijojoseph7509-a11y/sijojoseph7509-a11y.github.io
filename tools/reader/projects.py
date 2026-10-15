# Per-project settings for tools/reader/build.py, and per-section corrections where the automatic reading of a Figma
# section needs help. Section numbers are 0-based (section 0 = 01.webp). Coordinates are Figma px at 1440 wide.
#
# Corrections:
#   figure  [{x, y, w, h, src: 'desk'|'vis', alt}]   crop this region as one picture, words included
#   drop    [{x, y, w, h}]                           leave whatever sits here out of the text version
#   video   {x, y, src, label}                       the picture at x, y is the poster of a film
#   overlay {file, x, y}                             paint a layer onto 'desk' crops (Carekin's journey curve)
#   skip    True                                     leave the whole section out
#   no_bgphoto, img_text='keep', alt                 smaller switches, see build.py

PROJECTS = {
    'syntra': dict(slug='syntra', title='Syntra', tag='Interaction Design · Phygital Retail', status='Retail Tech, NID · team of three',
                   summary='An interactive perfume finder for ZARA: turn a knob and three sliders, see your scent, step into its world in VR and take it home on a ticket that comes alive in AR.',
                   color='#F3E7D8', theme='syntra'),
    'carekin': dict(slug='carekin', title='Carekin', tag='UX / Product Design', status='Self-initiated project',
                    summary='Medication coordination for families caring for an ageing parent: one schedule, the Carekin app for the organiser and WhatsApp for the helper, so every dose change reaches every carer.',
                    color='#0F3B38', theme='carekin'),
    'backwater': dict(slug='backwater', title='Backwater Line', tag='Information Design · Wayfinding', status='Self-initiated project',
                      summary='One map, one naming system and seven sign types for a ferry network on the Kochi backwaters, readable by day and after dark.',
                      color='#0E0F10', theme='backwater'),
    'ekmaati': dict(slug='ekmaati', title='Ekmaati', tag='Branding · Packaging', status='NID Semester 2 project',
                    summary='Brand identity, naming and temple-form packaging for the GI-tagged clay Ganesh idols of Pen.',
                    color='#2A1A10', theme='ekmaati'),
}
ORDER = ['syntra', 'carekin', 'backwater', 'ekmaati']

OVERRIDES = {
    'carekin': {
        0: {'drop': [{'x': 0, 'y': 0, 'w': 1440, 'h': 80}]},   # the mock site header in the title frame
        2: {'video': {'x': 440, 'y': 120, 'src': 'work/carekin/fx/walkthrough-540.mp4', 'label': 'Carekin walkthrough film, 49 seconds'}},
        18: {'drop': [{'x': 440, 'y': 425, 'w': 85, 'h': 175}, {'x': 880, 'y': 480, 'w': 60, 'h': 40}]},   # arrow labels of the mental model
        27: {'figure': [{'x': 30, 'y': 370, 'w': 1340, 'h': 320, 'src': 'desk',
                         'alt': 'Timeline from 7:55 to 8:25: at 8:00 Lakshmi taps Given while offline (old schedule); at 8:05 Priya verifies the new prescription; at 8:20 the signal returns and the log syncs.'}]},
        19: {'overlay': {'file': 'work/carekin/fx/journey-curve@2x.webp', 'x': 80, 'y': 330},
             'figure': [{'x': 20, 'y': 240, 'w': 1400, 'h': 470, 'src': 'desk',
                         'alt': 'Journey map: worry dips at "Dose changed, helper not told" and at "Did anyone give her the pill?", and is calm at the doctor visit, the daily routine and the end.'}]},
    },
    'backwater': {
        0: {'drop': [{'x': 0, 'y': 0, 'w': 1440, 'h': 80}]},
        36: {'no_table': True},
        3: {'video': {'x': 440, 'y': 120, 'src': 'work/backwater/fx/day-to-night-540.mp4', 'label': 'Backwater Line film, day to night, 41 seconds'}},
    },
    'ekmaati': {
        6: {'figure': [{'x': 40, 'y': 310, 'w': 1400, 'h': 890, 'src': 'desk',
                        'alt': 'Process curve from chart paper to a temple-shaped box: 01 word dump, 02 mind map, 03 audience and position, then 04 pencil marks, 05 names, 06 cardboard prototypes and 07 the temple box, across research, define, design and make.'}]},
        20: {'figure': [{'x': 20, 'y': 200, 'w': 1400, 'h': 490, 'src': 'desk',
                         'alt': 'Experience map of the errand in six moments: at the stall, carrying it home, tearing the arch, the doorway opens, a shrine on the desk, back to the water; with what the buyer does, thinks and feels (curious, anxious, expectant, delight, calm, bittersweet) and the design response to each.'}]},
        21: {'no_table': True},
        10: {'figure': [{'x': 230, 'y': 300, 'w': 1080, 'h': 660, 'src': 'desk',
                         'alt': 'The Ekmaati mark: a tilak, the only red in the system; two open ears; one brushstroke trunk; read whole, a person seated at prayer.'}]},
    },
    'syntra': {
        0: {'no_bgphoto': True, 'mericana_text': True,
            'figure': [{'x': 0, 'y': 0, 'w': 1440, 'h': 1240, 'src': 'vis', 'absorb': False, 'zoom': False,
                        'alt': 'Syntra, an interactive perfume finder: the wordmark over a soft amber photo of a perfume bottle.'}]},
        4: {'figure': [{'x': 0, 'y': 215, 'w': 1440, 'h': 600, 'src': 'desk',
                        'alt': 'Current journey map from our store visits: walks in, faces a wall of similar bottles; browse, reads names that say nothing about the smell; test, sprays 3 to 4 strips; ask staff, who may be busy or untrained in scent; decide, picks the last one smelled or leaves.'}]},
        7: {'figure': [{'x': 90, 'y': 380, 'w': 1350, 'h': 800, 'src': 'desk',
                        'alt': 'How Syntra works: turn a mood knob and three sliders; an ESP32 reads every control about every 30 ms; the kiosk page scores all 19 ZARA scents; the closest scent appears with how close it is. Then a double press steps into the scent in VR on a Meta Quest 3, a 2-second hold prints a 58 mm thermal ticket, and a phone pointed at the ticket drawing lifts it off the paper in AR.'}]},
        14: {'mericana_text': True},
    },
}
