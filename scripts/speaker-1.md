# Speaker 1 · Slides 1–4 · Opening, binomial, the dataset, descriptive statistics

**Your time:** ≈6½ min. **Remote:** ↓ / Space / clicker = next, ↑ = back. Lines in *italics* are stage directions; the rest can be read aloud. **Bold** numbers are real results from R and are on the slides.

**Before you start:** open the site, press **F11**, then **click once anywhere** so the page has keyboard focus.

*Opening line (before slide 1):*
> Hi everyone, we're [names], and today we'll show you the maths hiding inside something you use every day.

---

## 1 · Title — “Somebody is trying to trick you right now” (≈1 min)

*The 20 cards fly in, line up and form a circle. Wait for the circle.*

> Raise your hand if you got a spam message this week. … Most of you. Today I want to show you that the
> thing protecting you from those messages is not magic, and not even really “AI” — it's probability and
> statistics that we all study in this course.

*Press ↓. The circle opens into an arc and the title appears.*

> So the question for today is: **how does your phone know it's spam?** Every card you see here is a real
> plot we made in R from the data we'll use. *(Hover one card so it flips.)* Each card flips to show what it is.

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

*Hand-over to Speaker 2:*
> So length is a clue, but it's a weak one. To do better we need to look at the actual words, and for that we need Bayes. Over to [Speaker 2].

---

## Questions you might get on your slides

| Question | Answer |
|---|---|
| **Why Welch and not Student's t-test?** | The two groups have very different variances (SD 58 vs 29). Welch doesn't assume equal variances. |
| **Where is the data from?** | UCI Machine Learning Repository, SMS Spam Collection (Almeida & Hidalgo, 2011). Public and free. |
