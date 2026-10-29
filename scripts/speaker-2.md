# Speaker 2 · Slides 5–8 · Bayes, the word-by-word film, Poisson, χ² test

**Your time:** ≈10 min. **Remote:** ↓ / Space / clicker = next, ↑ = back. Lines in *italics* are stage directions; the rest can be read aloud. **Bold** numbers are real results from R and are on the slides.

*Opening line:*
> Thanks. Let's start with the single most important idea in this talk: Bayes' theorem.

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

*Hand-over to Speaker 3:*
> So we know which clues matter, and we've proved they're not chance. Now let's see how spammers try to dodge them, and put the whole filter to the test. Over to [Speaker 3].

---

## Questions you might get on your slides

| Question | Answer |
|---|---|
| **Why “naive”?** | It assumes words are independent given the class. “Free” and “prize” clearly aren't independent, but the classifier still ranks messages well because we only need the right *ordering*, not perfect probabilities. |
| **What is Laplace smoothing?** | We add 1 to every word count. Otherwise a word never seen in ham would have P(word \| ham) = 0, and one word could force the probability to exactly 100 %. |
| **Why logs?** | Multiplying hundreds of probabilities below 1 underflows to 0 on a computer. log(a·b) = log a + log b, so we add instead. |
| **Why a permutation test?** | It shows what “chance” looks like without assuming any formula. It agrees with the classic χ² p-value. |
