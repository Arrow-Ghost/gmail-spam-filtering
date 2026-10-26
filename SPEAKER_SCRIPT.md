# Speaker script — “How does your phone know it's spam?”

**Length:** about 18–20 minutes plus questions. **Remote:** ↓ / Space / clicker = next, ↑ = back.
**Before you start:** open the site, press **F11**, then **click once anywhere** so the page has keyboard focus.
Lines in *italics* are stage directions. Everything else you can read aloud more or less as written.
Numbers in **bold** are the real results from R; they appear on the slides too.

---

## 1 · Title — “Somebody is trying to trick you right now” (≈1 min)

*The 20 cards fly in, line up and form a circle. Wait for the circle.*

> Raise your hand if you got a spam message this week. … Most of you. Today I want to show you that the
> thing protecting you from those messages is not magic, and not even really “AI” — it's probability and
> statistics that we all study in this course.

*Press ↓. The circle opens into an arc and the title appears.*

> So the question for today is: **how does your phone know it's spam?** Every card you see here is a real
> plot I made in R from the data we'll use. *(Hover one card so it flips.)* Each card flips to show what it is.

*Press ↓ twice more: the cards slide along the arc, then the deck moves on.*

---

## 2 · The problem — “Your inbox is under siege” (≈2 min)

**Concept:** Binomial distribution, complement rule, expected value, law of large numbers.

> In our dataset, **13.4 %** of all text messages are spam. Suppose you get 30 texts a day, and each one is
> spam with probability p = 0.134, independently of the others. Then the number of spam texts you receive
> in a day, X, follows a **binomial distribution** with n = 30 and p = 0.134.

*Point at the formula.*

> The probability of exactly k spam messages is n choose k, times p to the k, times (1 − p) to the n − k.
> The bar chart is that formula. The most likely outcome is 3 or 4 spam messages a day.

*Point at the big pink number.*

> What's the chance you get **at least one** spam today? Instead of adding up k = 1, 2, 3 … all the way to
> 30, we use the complement: 1 minus the probability of zero spam, which is 1 − (1 − p)ⁿ. That's
> **98.7 %**. You are almost guaranteed to be targeted every single day.

*Drag the n slider down to 5, then back to 30.*

> Even with only 5 texts a day it's still over 50 %. The expected number is n·p = **4.02**, with a
> standard deviation of √(np(1 − p)) = **1.87**.

*Click ▶ Simulate a day two or three times.*

> Now let's simulate a day. Each bubble is a **real message** from the dataset; pink ones are spam. Each
> click is one day. Watch the average across days settle near 4 — that's the **law of large numbers**:
> the simulated average converges to the expected value np.

*(Optional) scroll to the R code:* “In R this is one line: `dbinom()`.”

---

## 3 · The data — 5,574 real text messages (≈1.5 min)

> All of this is real data: the **UCI SMS Spam Collection**, a public research dataset. **5,574** texts,
> each labelled by a human as spam or ham — ham just means a normal message. **747** spam and **4,827**
> ham, with **7,211** different words.

*Click the red “SMSSpamCollection” folder to open it, then click “spam examples”.*

> Here are some real spam messages. You'll notice the patterns straight away: “FREE”, “WIN”, “call now”,
> long phone numbers, money signs. *(Close with Esc.)*

*Click the “+” on the analysis.R folder, then open one of the code sheets.*

> Every number in this talk comes from one R script. This folder holds its sections. R reads the whole
> dataset with a single `read.delim()` call.

*Open the “R plots” folder and click a plot.*

> And these are the plots R produced.

---

## 4 · Descriptive statistics — “Spam talks too much” (≈2 min)

**Concept:** mean, median, standard deviation, skewness, Welch two-sample t-test.

> Before building any model, a statistician first **describes** the data. The simplest thing to measure
> is message length.

*Point at the histogram (cyan = ham, pink = spam).*

> Normal messages are short: median **52** characters. Spam is long: median **149**. Look at the shapes.
> Ham is **right-skewed**: lots of tiny “ok”, “on my way” texts and a long tail. Spam piles up just under
> 160 characters, which is exactly the length of one SMS. Spammers fill every character they pay for.

*Point at the stat tiles.*

> Notice ham's mean (**71.5**) is bigger than its median (52). That's the skew pulling the mean up, so
> the median is the better summary for ham. Spam's spread is also much smaller: SD **28.9** vs **58.3**.

*Point at the t-test box.*

> Is the difference real, or could it be chance? Null hypothesis: both groups have the same mean length.
> We use **Welch's t-test** because the two variances are clearly different.
> t = **−49.8**, and the p-value is smaller than R can even print: < 2.2 × 10⁻¹⁶. The 95 % confidence
> interval says spam is between **65 and 70 characters longer**. We reject H₀. Since the data are skewed,
> I also checked with the non-parametric Wilcoxon test, and it agrees.

*Click “raw counts” to show the other view:* “In absolute numbers, ham dominates, because there's 6× more of it.”

> So length alone is a clue. Remember that, because later it's the baseline our real filter has to beat.

---

## 5 · Bayes' theorem — “The word ‘free’” (≈3 min) ⭐

**Concept:** conditional probability, Bayes' theorem, prior, base-rate fallacy.

> Here's the key idea of the whole talk. Counting gives us P(word | spam): **22.8 %** of spam messages
> contain the word “free”. But that's the wrong way round! When a message arrives, we know the word and
> want the class. We want **P(spam | “free”)**. Bayes' theorem flips the condition:

> P(spam | free) = P(free | spam) × P(spam) / P(free) = 0.228 × 0.134 / 0.041 ≈ **74 %**.

*Click the chips: “prize”, then “call”, then “you”, then “ok”.*

> “prize” never appears in a normal message in this dataset, so P(spam | prize) = **100 %**.
> “call” is only **60 %**: real people say “call me” too. “you” is just **15 %**, which is close to the
> prior, so it's useless as evidence. And “ok” drops it to **2 %**.
> The green line is the prior, 13.4 %. Words to the right of it push towards spam, words to the left
> push towards ham.

*Move to the right panel and click the “medical test” preset.*

> Now the most important lesson in probability. Imagine a disease that 1 in 100 people have, and a test
> that is 99 % sensitive with a 5 % false-positive rate. You test positive. What's the chance you're sick?
> Most people say 99 %. *(Pause.)* It's about **17 %**.

*Point at the dots.*

> Look at 1,000 people. 10 are sick and the test catches them: the pink dots. But 990 are healthy, and 5 %
> of them, about 50, also get a positive: the orange dots. So out of 60 positives, only 10 are really sick.
> This is the **base-rate fallacy**: when something is rare, most alarms are false.

*Click “rare scam”, then drag the prior slider up slowly.*

> As the bad thing gets more common, the posterior climbs. That's exactly why a spam filter never trusts
> one clue. It combines **every word** in the message, which is the next slide.

---

## 6 · The film — “Reading, word by word” (≈2.5 min) ⭐

**Concept:** sequential Bayesian updating, likelihood ratios, log-odds, Naive Bayes.
*Scroll slowly (or press ↓ once per card). R rendered every frame of this animation.*

**Card 1 · Prior.**
> Two real messages the model has never seen are read one word at a time. Pink is spam, cyan is ham.
> Before reading anything, the filter only knows the base rate, so both lines start at **13.6 %**.

**Card 2 · Likelihood.**
> Every word is evidence. It multiplies the odds by its **likelihood ratio**: P(word | spam) divided by
> P(word | ham). Watch the pink message. “you have an” actually pushes it *down* to **3.5 %**, because
> normal people say those words too. Then “customer” jumps it to **50 %**, “service” to **95 %**, and
> “announcement” to **99.5 %**. Meanwhile the ham message “fine if that's the way u feel” drops to
> almost zero after just three words.

**Card 3 · Posterior.**
> Multiplying hundreds of small probabilities makes numbers too tiny for a computer, so we take logarithms
> and **add** instead. Log posterior odds = log prior odds + the sum of the words' log likelihood ratios.
> That single sum (the formula at the bottom right) *is* the Naive Bayes classifier. “Naive” because it
> assumes the words are independent given the class. That's not really true, but it works remarkably well.

**Card 4 · Verdict.**
> Final answer: the spam ends at essentially **100 %**, the ham at essentially **0 %**. And notice the
> phone number: “0800” alone added a huge amount of evidence.

---

## 7 · Poisson — “Spammers are predictable!” (≈2 min)

**Concept:** Poisson distribution, maximum-likelihood estimate, χ² goodness-of-fit, overdispersion.

> Let's count something: **exclamation marks per message**. Counts of rare events that happen at a steady
> rate follow a Poisson distribution, with one parameter λ, the average rate. The maximum-likelihood
> estimate of λ is just the sample mean: **0.73** “!” per spam message.

*Point at bars (data) and the green line (Poisson model).*

> The bars are the real data, the green dots are what Poisson(0.73) predicts. They match well. A χ²
> goodness-of-fit test gives p = **0.059**, which is above 0.05, so we **cannot reject** the Poisson model.

*Drag the λ slider away from the MLE, to about 1.5, and watch χ² explode. Then drag it back to 0.73.*

> If I pick the wrong λ, the fit gets terrible. The MLE is the value that fits best.

*Click the “ham” chip.*

> Now normal messages. λ is only **0.18**, so spam uses about **4× more** exclamation marks. But here the
> Poisson model fails badly: p ≈ 10⁻⁸². Why? For a Poisson distribution, the **variance equals the mean**.
> For ham the variance is about **twice** the mean; we call that overdispersion. Most people never type
> “!”, and a few people type “!!!!!”. Humans are bursty. Spammers use a template, so they're regular.
> The variance-to-mean ratio is a quick fingerprint of who wrote a message.

---

## 8 · χ² test of independence — “Could it be pure chance?” (≈2.5 min) ⭐

**Concept:** contingency table, expected counts, χ² statistic, permutation test, Cramér's V.

> I sorted every message by its strongest clue: does it contain a phone number (5+ digits), a £ or $ sign,
> a web link, or none of those?

*Point at the table.*

> Look at the first row. Of 588 messages with a phone number, **585 are spam**. Our null hypothesis is
> that the clue and the label are **independent**.

*Click “expected E under H₀”.*

> If they were independent, we'd expect only about 79 spam messages in that row, using
> E = row total × column total / N. We observed 585. The χ² statistic adds up (O − E)² / E over every cell.

*Click “⤨ shuffle once” two or three times, then “⤨ ×250”.*

> Here's the intuition behind a hypothesis test. If H₀ were true, the labels wouldn't matter, so I can
> **shuffle** the spam labels randomly across all 5,574 messages and recompute χ². Each shuffle is one
> “world where H₀ is true”. Let's do 250 of them. The purple histogram is the null distribution: chance
> alone gives values around 3, rarely above **18**.

*Point at the pink line on the right.*

> Our real value is **4,485**. The axis even has to break to fit it. With 3 degrees of freedom the 5 %
> critical value is **7.81**. The p-value is effectively zero, so we reject independence.
> Cramér's V = **0.90**, on a 0-to-1 scale, says the association is very strong.

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

> One last thing. The same maths works far beyond SMS. In my own project, **PhishGuard.js**, I use these
> exact ideas to protect software: Bayes to find which code library triggered an alarm, edit distance to
> catch fake packages like “loadsh” pretending to be “lodash”, and a Poisson test to spot malware that
> phones home on a timer. Once you know the maths, you see it everywhere.

> **Thank you, and I'm happy to take questions.**

---

## Likely questions — short answers

| Question | Answer |
|---|---|
| **Why “naive”?** | It assumes words are independent given the class. “Free” and “prize” clearly aren't independent, but the classifier still ranks messages well because we only need the right *ordering*, not perfect probabilities. |
| **What is Laplace smoothing?** | We add 1 to every word count. Otherwise a word never seen in ham would have P(word \| ham) = 0, and one word could force the probability to exactly 100 %. |
| **Why logs?** | Multiplying hundreds of probabilities below 1 underflows to 0 on a computer. log(a·b) = log a + log b, so we add instead. |
| **Is 98 % good?** | Always guessing “ham” already gets 86.6 %, because 86.6 % of messages are ham. That's why we also look at recall, precision and AUC, not just accuracy. |
| **Why Welch and not Student's t-test?** | The two groups have very different variances (SD 58 vs 29). Welch doesn't assume equal variances. |
| **Why a permutation test?** | It shows what “chance” looks like without assuming any formula. It agrees with the classic χ² p-value. |
| **Train/test split?** | 70 % of messages to learn the word probabilities, 30 % held back to test, so we measure performance on unseen data. |
| **Can modern spam beat this?** | Yes: messages with no spammy words, images, or new tricks. Real filters add sender reputation, links, and machine learning on top, but Bayes is still at the core. |
| **Where is the data from?** | UCI Machine Learning Repository, SMS Spam Collection (Almeida & Hidalgo, 2011). Public and free. |

---

## Timing cheat-sheet

| # | Slide | Time | Must-do interaction |
|---|---|---|---|
| 1 | Title | 1:00 | let circle form, ↓ to arc |
| 2 | Binomial | 2:00 | Simulate a day ×3 |
| 3 | Data | 1:30 | open spam examples |
| 4 | Descriptive | 2:00 | point at medians + t-test |
| 5 | Bayes | 3:00 | “prize” chip, **medical test** preset |
| 6 | Film | 2:30 | scroll through 4 cards |
| 7 | Poisson | 2:00 | toggle spam → ham |
| 8 | χ² | 2:30 | **shuffle ×250** |
| 9 | Edit distance | 1:30 | “fr33” |
| 10 | Live filter | 3:00 | **audience types** |
| 11 | Accuracy | 2:00 | threshold slider, “use best t” |
| 12 | Summary | 1:00 | PhishGuard card, thank you |
