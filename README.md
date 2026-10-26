# How does your phone know it's spam? — Maths × R

A scroll-driven seminar deck on the probability and statistics behind spam filters. Every
number, plot, animation frame and the live classifier come from `r/analysis.R`, run on the
UCI SMS Spam Collection (5,574 real text messages, `r/data/sms/`).

## 1. Run the R analysis (only if you change the data or the script)

```
Rscript r/analysis.R
```

Writes `site/data/stats.json`, `site/data/model.json` (the trained Naive Bayes model),
7 plots, 20 thumbnail cards and 240 film frames into `site/public/r/`. Needs `jsonlite`.

## 2. Present

```
cd site
npm run build
npm run start
```

Open http://localhost:3000 and press F11.

- **↓ / Space / PageDown / → / clicker**: next stop. **↑ / PageUp / ←**: back.
- Slide 10 is a live spam filter: let the audience shout out messages and type them in.

## More

- **SPEAKER_SCRIPT.md**: what to say and click on every slide, with likely questions and timings.
- **DEPLOY.md**: frontend on Vercel, the R API (`r/api`, plumber) on Render.

## Slides

1. Title (20 cards = R plots) · 2. Binomial: spam per day + phone simulation · 3. The dataset (glass folders)
4. Message length + Welch t-test · 5. Bayes: P(spam | "free") + base-rate trap (medical test)
6. Film: two real messages read word by word (R frames) · 7. Poisson: '!' per message + goodness of fit
8. χ² independence + live permutation test · 9. Edit distance: "fr33" → "free"
10. Live Naive Bayes filter · 11. Accuracy, ROC, expected-cost threshold · 12. Summary + PhishGuard bonus + full R source

The earlier PhishGuard version of the analysis is kept in `r/phishguard/`.
