# Speaker 3 · Slides 9–12 · Edit distance, live filter, accuracy, summary

**Your time:** ≈8 min. **Remote:** ↓ / Space / clicker = next, ↑ = back. Lines in *italics* are stage directions; the rest can be read aloud. **Bold** numbers are real results from R and are on the slides.

*Opening line:*
> Thanks. Spammers know all of this, so they cheat. Here's how.

---

## 9 · Edit distance — “FR33 PR1ZE, w1nner!!” (≈1.5 min)

**Concept:** Levenshtein distance, dynamic programming, a metric on strings.

> Spammers know filters look for “free”, so they write “fr33”. To a computer that's a completely new word
> with no evidence. The fix is to measure how **close** two words are. The Levenshtein distance is the
> fewest single-letter insertions, deletions or substitutions that turn one word into another.

*Point at the grid.*

> We compute it with **dynamic programming**: each cell is the minimum of three neighbours plus one, and
> the green path is the cheapest sequence of edits. “fr33” → “free” takes **2** substitutions.

*Click the chips: “w1nner”, “pr1ze”, “c4sh”. Then type your own, e.g. “m0bile”.*

> Within 2 edits of a known spam word, we treat it as that word, and it gets its evidence back.
> In R this is a single built-in function: `adist()`.

---

## 10 · Live filter — “Try to fool the filter” (≈2–3 min) ⭐⭐ audience moment

**Concept:** the full Naive Bayes model in action.

> This is the real model R trained on **3,902** messages: **7,211** words, each with its own likelihood
> ratio. Let's try it.

*Click “example 1” (prize spam), then “example 2” (lunch), then “example 5” (bank PIN scam).*

> Every chip is a word with its log likelihood ratio: pink pushes towards spam, cyan towards ham, grey
> means the model has never seen that word, so it carries no evidence. The needle is P(spam | your words).
> The table underneath shows the actual sum: prior log-odds plus each word's contribution.

*Turn to the audience.*

> Now you. Shout out a message, a spam one or a normal one, and let's see if you can fool it.

*Type what they say. Good things to try if nobody speaks:*
- *“hey can you call me when you're free” — normal, but contains “call” and “free”. (Usually still ham: the other words win.)*
- *“Congratulations on your exam results!” — “congratulations” is spammy; see what happens.*
- *a spam with no keywords, e.g. “click here to update your details” — may slip through: that's a limitation.*

> When it gets one wrong: “Good, so the model isn't perfect, and the next slide measures exactly how
> imperfect.”

*If the dot under the verdict says “computed live by R 4.6.1 (plumber API)”, point it out:*
> “And this answer was just computed by R running on a server, not by the web page.”

---

## 11 · Accuracy & cost — “98.3 % right. Is that good?” (≈2 min)

**Concept:** confusion matrix, precision/recall, ROC & AUC, decision threshold, expected cost.

> We tested on **1,672** messages the model never saw while learning. At threshold 0.5 it gets
> **98.3 %** right: **193** spam caught, **1,450** real messages kept, **24** spam missed and only **5** real
> messages wrongly sent to spam.

*Point at the ROC curve.*

> The ROC curve shows every possible threshold at once: true-positive rate against false-positive rate.
> The area under it, AUC, is **0.98** for Naive Bayes, against **0.87** for message length alone, the
> baseline from slide 4.

*Drag the threshold slider down to 0.05, then up to 0.95, and watch the four boxes.*

> Lower threshold: we catch more spam, but we also lose real messages. Higher: the opposite. Which is
> better? Accuracy can't answer that, because the two mistakes aren't equal. Losing a message from your
> boss is far worse than seeing one spam.

*Point at the cost sliders. Default is: losing a real message costs 10, one spam costs 1. Click “use best t”.*

> We define an expected cost, 10 × false positives + 1 × false negatives, and choose the threshold that
> minimises it. The best threshold moves up to about **0.96**: only act when you're very sure.
> *(Drag “cost of one spam” to 10 as well.)* If both mistakes cost the same, it drops back toward 0.5.
> Every email provider makes exactly this decision. It's not maths alone; it's maths plus values.

---

## 12 · Summary — “Your spam filter is a statistician” (≈1 min)

*Point across the 10 tiles.*

> So in one spam filter we used: the binomial distribution, descriptive statistics, a t-test, Bayes'
> theorem and the base-rate fallacy, the Poisson distribution with a goodness-of-fit test, a χ² test of
> independence, edit distance, Naive Bayes, and expected-cost decision making. All on real data, all in R.

*Point at the “Spam filters for code” card.*

> One last thing. The same maths works far beyond SMS. In a project from our team, **PhishGuard.js**, we use these
> exact ideas to protect software: Bayes to find which code library triggered an alarm, edit distance to
> catch fake packages like “loadsh” pretending to be “lodash”, and a Poisson test to spot malware that
> phones home on a timer. Once you know the maths, you see it everywhere.

> That's the end of our walkthrough.

---

*Closing (all three speakers step forward):*
> Thank you. We're happy to take questions.

---

## Questions you might get on your slides

| Question | Answer |
|---|---|
| **Is 98 % good?** | Always guessing “ham” already gets 86.6 %, because 86.6 % of messages are ham. That's why we also look at recall, precision and AUC, not just accuracy. |
| **Train/test split?** | 70 % of messages to learn the word probabilities, 30 % held back to test, so we measure performance on unseen data. |
| **Can modern spam beat this?** | Yes: messages with no spammy words, images, or new tricks. Real filters add sender reputation, links, and machine learning on top, but Bayes is still at the core. |
| **Where is the data from?** | UCI Machine Learning Repository, SMS Spam Collection (Almeida & Hidalgo, 2011). Public and free. |
