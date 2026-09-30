# CLAUDE.md — Bible Pointers on Marriage Series (12 Lessons)

**Project:** Bible Relationships Teaching Series  
**URL:** https://biblerelationships.pages.dev/  
**Repository:** https://github.com/Daveflyon/biblerelationships.git  
**Last Updated:** 30 September 2026  
**Version:** 3.0 (Twelve-lesson series completed with navigation and content enhancements)

---

## Project Overview

Bible Pointers on Marriage is a twelve-lesson interactive educational series for The Well Shrewsbury. Each lesson is a self-contained HTML file with:
- Audio player with playback speed controls
- Opening question and key scripture
- Core Truth statement
- Bible Teaching section (expandable)
- Discovery questions with browser-based saving
- Group discussion questions
- Application guidance (context-specific)
- Revision flashcards
- Forward navigation to next lesson

**Lessons:**
1. Why Marriage Exists
2. One Flesh
3. How to Wait for God's Timing
4. How to Discern if God Has Someone for You
5. What to Know Before You Say Yes
6. The Biblical Roles of Husband and Wife
7. How to Disagree Well
8. Sex and Physical Intimacy in Marriage
9. Getting the Priorities Right
10. Guarding Your Heart Protects Your Marriage
11. Being Unequally Yoked
12. Putting It Together (Series Conclusion)

---

## Session Log

### 30 September 2026 — Complete Series Update (Lessons 1–12)

**Objective:** Update the Bible Pointers on Marriage series from ten lessons to twelve, enhance content, improve navigation, and refine pastoral support pathways.

#### Changes by Category

##### 1. LESSON 11 & 12 — Content Enhancements

**File:** `bpm-l11-unequally-yoked.html`

- **Core Truth Enhancement:** Added emphasis on "covenant with Christ Himself"
  - New text: "At its heart, this is about covenant with Christ Himself. You have pledged allegiance to Jesus as Lord; your spouse has not. You cannot walk the same direction spiritually."
  - Clarifies the spiritual foundation of the unequally yoked teaching

- **Hebrews 7:10 Reframe:** Replaced Levi/Abraham example with clearer theological language
  - Old: Metaphorical story about Levi paying tithes in Abraham's loins
  - New: "Hebrews 7:10 shows how God honours faith across generations. Levi participated in Abraham's covenant faithfulness though unborn. Similarly, your faith in Christ has a covering power for your household that extends beyond your spouse's current belief."
  - Added: "This is not a guarantee that conflict will disappear, but a promise that your faithfulness matters and is not wasted."

- **6th Discussion Question:** Added new question to Group Discussion Questions
  - "What would it look like to speak clearly about your faith to an unbelieving spouse without being preachy or condemning? Where's the line between faithful witness and pressure?"

**File:** `bpm-l12-putting-it-together.html`

- **Christ-Connection Paragraph:** Added closing reflection to Bible Teaching section
  - Placed before "Going Deeper" note
  - Text: "Throughout these twelve lessons, you have seen Christ repeatedly. In why marriage exists, He is the model of covenant love. In the roles of husband and wife, His leadership and the Church's response are reflected. In the priority of your marriage, His bond with His people is mirrored. As you step into your real life, keep seeing your marriage as a picture of something bigger than yourselves."
  - Provides theological capstone to the entire series

##### 2. SERIES METADATA UPDATE (Lessons 1–10)

**Files:** `bpm-l01-why-marriage-exists.html` through `bpm-l09-priorities.html`

- Changed series subtitle from "A ten-lesson guide" → "A twelve-lesson guide"
- Updated lesson counters from "Lesson X of 10" → "Lesson X of 12"
- Rationale: Series expansion to include Lessons 11 and 12; metadata must reflect complete scope

**Commit 1:** "Update Lessons 11 and 12: Core truth enhancement, Hebrews 7:10 reframe, add 6th discussion question, add Christ-connection paragraph"

##### 3. LESSON 10 SPECIAL UPDATES

**File:** `bpm-l10-guard-your-heart.html`

- **Removed "Series Complete" Message**
  - Deleted: `<div class="series-close">` section that marked Lesson 10 as the final lesson
  - Reason: Lesson 10 is no longer the end; series continues to Lesson 12

- **Added Transition Message to Lesson 11**
  - Inserted styled div before "Back to all lessons" link
  - Text: "Your marriage is not finished growing. Lesson 11 addresses a specific challenge many couples face. Keep going."
  - Style: Gray background (#f2f2f2), left border (#1F3864), bold emphasis
  - Purpose: Encourages continued engagement with Lesson 11

##### 4. FORWARD NAVIGATION BUTTONS (Lessons 1–11)

**Files:** All lesson files `bpm-l01-why-marriage-exists.html` through `bpm-l11-unequally-yoked.html`

- **Added "Next Lesson →" button** to each lesson before "Back to all lessons" link
- **Styling:** Dark blue background (#1F3864), white text, bold font, centered, inline-block display
- **Navigation chain:**
  - L01 → L02 (bpm-l02-one-flesh.html)
  - L02 → L03 (bpm-l03-how-to-wait.html)
  - L03 → L04 (bpm-l04-how-to-discern.html)
  - L04 → L05 (bpm-l05-what-to-know.html)
  - L05 → L06 (bpm-l06-biblical-roles.html)
  - L06 → L07 (bpm-l07-how-to-disagree.html)
  - L07 → L08 (bpm-l08-intimacy.html)
  - L08 → L09 (bpm-l09-priorities.html)
  - L09 → L10 (bpm-l10-guard-your-heart.html)
  - L10 → L11 (bpm-l11-unequally-yoked.html)
  - L11 → L12 (bpm-l12-putting-it-together.html)
- **Purpose:** Improves user flow; makes progression to next lesson obvious and accessible

**Commit 2:** "Batch update: Lessons 1-11 metadata, content, and navigation"

##### 5. LESSON 8 — PASTORAL SUPPORT PATHWAY REFINEMENT

**File:** `bpm-l08-intimacy.html` — Application section, "If you carry a wound" row

**First update:** Added pastoral support pathway
- Text: "...speak with one of our leaders; we have resources and pastoral care for you"

**Revised update (this session):** Redirected to professional mental health support
- Old: "speak with one of our leaders; we have resources and pastoral care for you"
- New: "speak with a professional counselor or therapist; we can recommend resources and referrals"
- **Rationale:** Sexual trauma and shame require licensed professional intervention. While pastoral care is valuable and available through church referral, the primary pathway for individuals carrying sexual wounds must be to qualified mental health professionals.

**Commit 3:** "Update L08: Direct readers to professional counselor/therapist for sexual wound support"

---

## Files Modified

| File | Updates | Commit |
|------|---------|--------|
| bpm-l01-why-marriage-exists.html | Metadata, navigation | 2 |
| bpm-l02-one-flesh.html | Metadata, navigation | 2 |
| bpm-l03-how-to-wait.html | Metadata, navigation | 2 |
| bpm-l04-how-to-discern.html | Metadata, navigation | 2 |
| bpm-l05-what-to-know.html | Metadata, navigation | 2 |
| bpm-l06-biblical-roles.html | Metadata, navigation | 2 |
| bpm-l07-how-to-disagree.html | Metadata, navigation | 2 |
| bpm-l08-intimacy.html | Metadata, navigation, support pathway | 2, 3 |
| bpm-l09-priorities.html | Metadata, navigation | 2 |
| bpm-l10-guard-your-heart.html | Metadata, transition message, navigation | 2 |
| bpm-l11-unequally-yoked.html | Content (Core Truth, Hebrews 7:10, discussion Q), navigation | 1, 2 |
| bpm-l12-putting-it-together.html | Content (Christ-connection paragraph) | 1 |

---

## Quality Checklist

- [x] All metadata updated (ten → twelve)
- [x] Navigation chain complete (L01–L11)
- [x] Content enhancements completed (L11, L12)
- [x] Series-end messaging removed from L10
- [x] Transition message added to L10
- [x] Pastoral support pathway clarified (L08)
- [x] All files render correctly (no HTML syntax errors)
- [x] Files committed to git
- [x] Changes pushed to GitHub
- [x] Live site updates at https://biblerelationships.pages.dev/

---

## Deployment

**Repository:** https://github.com/Daveflyon/biblerelationships.git  
**Deployment:** GitHub Pages (automatic on push to main)  
**Live URL:** https://biblerelationships.pages.dev/  
**Branch:** main  
**Commits in this session:** 3

**Commit messages:**
1. "Update Lessons 11 and 12: Core truth enhancement, Hebrews 7:10 reframe, add 6th discussion question, add Christ-connection paragraph"
2. "Batch update: Lessons 1-11 metadata, content, and navigation"
3. "Update L08: Direct readers to professional counselor/therapist for sexual wound support"

---

## Notes for Future Updates

- **Series now complete at 12 lessons.** Future updates should maintain the twelve-lesson structure.
- **Navigation buttons on all lessons.** Ensure any new lessons added maintain the navigation chain pattern.
- **Lesson 12 is the capstone.** It should remain the final lesson and conclude the series narrative.
- **L08 support pathway is professional-first.** While pastoral care is available through referral, do not revert to church-leader-primary pathway for individuals with sexual trauma.
- **L10 transition messaging is deliberate.** It encourages progression to L11 (unequally yoked marriages); do not remove.

---

## Contact & Questions

For questions about lesson content, theology, or structure, refer to project stakeholders at The Well Shrewsbury.  
For technical questions about HTML/deployment, refer to repository maintainer.

**Last validated:** 30 September 2026, 12:00 UTC
