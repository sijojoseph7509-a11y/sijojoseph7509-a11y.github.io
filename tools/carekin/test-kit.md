# Carekin usability test kit

Runs the test plan from the case study (section 42): eight tasks, one Figma prototype, five people per role.
About 25 minutes a session. Fill in `results.csv` as you go, one row per person per task (result: completed, assisted or failed); send it back and it becomes the case study's "What testing showed" section.

## Who to recruit

| Role | How many | Who fits |
|---|---|---|
| Helper | 5 | Gives an older person their tablets at home: a home nurse, a maid or a family member who lives with them |
| Organiser | 5 | Manages a parent's medicines from another house or city |

The parent never uses the app, so they don't need a session. Pay people for their time if you can; a small gift is fine.

## Before each session

- Prototype open on an Android phone (helper: WhatsApp-style prompt and Home mode; organiser: the Carekin app).
- For task 6, plant one misread field in the prescription check screen. Example: the photo shows Amlodipine 2.5 mg, the field says 25 mg.
- For task 7, log the 8 am dose already, so the double-dose warning appears.
- A timer, and this sheet.

## Opening (read aloud)

> Thanks for helping. I'm testing an app, not you, so nothing you do can be wrong. If something is confusing, that's exactly what I need to find. Please think aloud as you go. Can I take notes and screen-record the phone? Only the screen, not your face, and I'll delete it after I've written up my notes. You can stop at any time.

Only record if they say yes. Write their answer in the notes column.

## Tasks

Read the prompt as written. Don't point at the screen or name buttons. If they're stuck for 30 seconds, mark the task as assisted and help them.

| # | Who | Read aloud | Success | Measure |
|---|---|---|---|---|
| 1 | Helper | "It's 8 in the morning and you've just given Amma her tablet. Use this message to let the family know." | Logged without help | Time from the message appearing; target under 5 s |
| 2 | Organiser | Show the Today screen for 5 seconds, then hide it. "Is Amma on track today? What's still to come?" | Right answer from one look | Answer correct or not |
| 3 | Organiser | "The doctor changed one of Amma's medicines yesterday. Find out what changed." | Says the old and the new dose | Correct with no hint |
| 4 | Organiser | "Your brother wants to know how today went. Send him today's status." | Status card sent to the group | Completed or not |
| 5 | Helper | "Amma refused her evening tablet. Record that." | Marked not given; the family is told | Completed, then ask the 1 to 7 question below |
| 6 | Organiser | "You've photographed a new prescription. Check it before it goes live." | Catches the misread field | Caught or missed |
| 7 | Helper | "Please give Amma her 8 am tablet." | Chooses not to give it again | Correct choice with no hint |
| 8 | Helper | Repeat tasks 1 and 5 with Android text size at 200% and TalkBack on | Both still complete | Completed; note any clipped text |

**The 1 to 7 question (after task 5):** "Overall, how easy or hard was that? 1 is very hard, 7 is very easy." The target is 5 or more.

## Closing questions

1. What, if anything, would stop you using this every day?
2. Who else in the family would need to see this?
3. Was anything worded in a way you wouldn't say yourself?

## After all ten sessions

- Count completion per task, median time for task 1, and the share who caught the planted error in task 6.
- Note every place two or more people got stuck: that's the next design change.
- Write what you changed, and retest the changed screens with two more people if you can.
