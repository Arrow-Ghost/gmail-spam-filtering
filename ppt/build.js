// Builds "How does your phone know it's spam?" as a PowerPoint deck.
// Numbers come from site/data/stats.json (written by r/analysis.R), pictures from site/public/r.
const path = require("path");
const pptxgen = require("pptxgenjs");
const { applyTheme } = require(process.env.PPTX_SKILL + "/scripts/apply_theme.js");

const ROOT = path.join(__dirname, "..");
const S = require(path.join(ROOT, "site/data/stats.json"));
const MODEL = require(path.join(ROOT, "site/data/model.json"));
const NOTES = require("./notes.json");
const img = (p) => path.join(ROOT, "site/public/r", p);
const OUT = path.join(__dirname, "spam-filter-maths.pptx");

const THEME = {
  name: "Spam Neon",
  headFontFace: "Arial",
  bodyFontFace: "Calibri",
  colors: {
    dk1: "07070C", lt1: "ECEBF5", dk2: "14131F", lt2: "8A8AA3",
    accent1: "FF2BD6", accent2: "2DE2FF", accent3: "C6FF3D", accent4: "FF8A3D", accent5: "9B7BFF", accent6: "FFFFFF",
    hlink: "2DE2FF", folHlink: "9B7BFF",
  },
};
const HEX = { pink: "FF2BD6", cyan: "2DE2FF", acid: "C6FF3D", orange: "FF8A3D", violet: "9B7BFF", card: "14131F", grid: "2A2840", muted: "8A8AA3" };

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
pres.title = "How does your phone know it's spam?";
pres.subject = "Probability and statistics behind spam filters, computed in R";
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
const C = pres.SchemeColor;

pres.defineSlideMaster({
  title: "Title",
  background: { color: THEME.colors.dk1 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.7, y: 2.0, w: 11.9, h: 2.2, fontSize: 54, bold: true, color: C.background1, valign: "bottom", align: "left" }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.7, y: 4.35, w: 10.5, h: 1.0, fontSize: 20, color: C.background2 }, text: "" } },
  ],
});
pres.defineSlideMaster({
  title: "Content",
  background: { color: THEME.colors.dk1 },
  objects: [
    { placeholder: { options: { name: "kicker", type: "body", x: 0.6, y: 0.35, w: 9, h: 0.35, fontSize: 12, bold: true, charSpacing: 3, color: C.accent3, margin: 0 }, text: "" } },
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.7, w: 12.1, h: 0.95, fontSize: 36, bold: true, color: C.background1, margin: 0, valign: "top", align: "left" }, text: "" } },
  ],
  slideNumber: { x: 12.3, y: 7.0, w: 0.6, h: 0.3, fontSize: 10, color: HEX.muted },
});

const pct = (x, d = 1) => `${(x * 100).toFixed(d)}%`;
const card = (slide, x, y, w, h, name) =>
  slide.addShape(pres.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.12, fill: { color: HEX.card }, line: { color: HEX.grid, width: 0.75 }, objectName: name });
const stat = (slide, x, y, w, value, label, color, size = 40) => {
  card(slide, x, y, w, 1.35, "stat " + label);
  slide.addText(value, { x: x + 0.2, y: y + 0.12, w: w - 0.4, h: 0.75, fontSize: size, bold: true, color, fontFace: "Arial", margin: 0, isTextBox: true, objectName: "value " + label });
  slide.addText(label, { x: x + 0.2, y: y + 0.88, w: w - 0.4, h: 0.35, fontSize: 12, color: HEX.muted, margin: 0, isTextBox: true, objectName: "label " + label });
};
const body = (slide, runs, x, y, w, h, size = 16, name = "text") =>
  slide.addText(runs, { x, y, w, h, fontSize: size, color: C.background1, valign: "top", margin: 0, paraSpaceAfter: 6, isTextBox: true, objectName: name });
const content = (n, section, kicker, title) => {
  const s = pres.addSlide({ masterName: "Content", sectionTitle: section });
  s.addText(kicker.toUpperCase(), { placeholder: "kicker" });
  s.addText(title, { placeholder: "title" });
  s.addNotes(NOTES[String(n)]);
  return s;
};
const plot = (slide, file, x, y, w, name) => slide.addImage({ path: img(file), x, y, w, h: (w * 860) / 1400, objectName: name, altText: name });

// ---------------------------------------------------------------- 1 title
pres.addSection({ title: "Opening" });
{
  const s = pres.addSlide({ masterName: "Title", sectionTitle: "Opening" });
  for (let i = 0; i < 10; i++)
    s.addImage({ path: img(`thumbs/t${String(i + 1).padStart(2, "0")}.png`), x: 0.7 + i * 1.2, y: 0.55, w: 1.05, h: 1.49, objectName: `R plot card ${i + 1}`, altText: "R plot thumbnail" });
  s.addText([{ text: "How does your phone know it's " }, { text: "spam?", options: { color: C.accent1 } }], { placeholder: "title" });
  s.addText(`The probability and statistics behind every spam filter, worked out in R on ${S.counts.messages.toLocaleString()} real text messages`, { placeholder: "body" });
  s.addText("Binomial · Bayes · Poisson · χ² · t-test · Naive Bayes · ROC · Edit distance", { x: 0.7, y: 5.55, w: 11.9, h: 0.4, fontSize: 14, color: HEX.acid, charSpacing: 2, margin: 0, isTextBox: true, objectName: "topics" });
  s.addNotes(NOTES["1"]);
}

// ---------------------------------------------------------------- 2 binomial
{
  const s = content(2, "Opening", "02 · The problem · Binomial", "Your inbox is under siege");
  body(s, [
    { text: `${pct(S.p_spam)} of text messages in our data are spam. With 30 texts a day, the number of spam texts is `, options: {} },
    { text: "X ~ Binomial(n = 30, p = 0.134)", options: { bold: true, color: C.accent2 } },
  ], 0.6, 1.85, 5.6, 1.0);
  stat(s, 0.6, 3.0, 5.6, pct(S.binom.p_atleast1), "P(at least one spam today) = 1 − (1 − p)ⁿ", HEX.pink, 54);
  stat(s, 0.6, 4.55, 2.7, S.binom.mean.toFixed(2), "expected spam per day (np)", HEX.cyan, 34);
  stat(s, 3.5, 4.55, 2.7, S.binom.sd.toFixed(2), "standard deviation √(np(1−p))", HEX.violet, 34);
  body(s, "On the website: drag n and p, and press “Simulate a day” to watch the average converge to np.", 0.6, 6.15, 5.6, 0.6, 13, "website hint");
  plot(s, "binom.png", 6.6, 1.85, 6.15, "Binomial pmf plotted in R");
}

// ---------------------------------------------------------------- 3 data
pres.addSection({ title: "Describing the data" });
{
  const s = content(3, "Describing the data", "03 · The data", "5,574 real text messages");
  const cells = [
    [S.counts.messages.toLocaleString(), "messages", HEX.acid],
    [String(S.counts.spam), "spam", HEX.pink],
    [S.counts.ham.toLocaleString(), "ham (normal)", HEX.cyan],
    [S.counts.vocab.toLocaleString(), "different words", HEX.violet],
  ];
  cells.forEach(([v, l, c], i) => stat(s, 0.6 + i * 3.08, 1.85, 2.85, v, l, c, 40));
  const ex = (x, label, color, text) => {
    card(s, x, 3.55, 5.95, 2.55, label + " example");
    s.addText(label, { x: x + 0.3, y: 3.75, w: 5.3, h: 0.35, fontSize: 13, bold: true, color, charSpacing: 2, margin: 0, isTextBox: true, objectName: label + " tag" });
    s.addText(`“${text}”`, { x: x + 0.3, y: 4.15, w: 5.35, h: 1.8, fontSize: 15, italic: true, color: C.background1, valign: "top", margin: 0, isTextBox: true, objectName: label + " message" });
  };
  ex(0.6, "SPAM", HEX.pink, S.examples.spam[1]);
  ex(6.78, "HAM", HEX.cyan, S.examples.ham[1]);
  body(s, "Source: UCI SMS Spam Collection (Almeida & Hidalgo, 2011). Every number in this talk was computed by analysis.R.", 0.6, 6.35, 12.1, 0.4, 12, "source");
}

// ---------------------------------------------------------------- 4 descriptive
{
  const s = content(4, "Describing the data", "04 · Descriptive statistics · Welch t-test", "Spam talks too much");
  plot(s, "length.png", 0.6, 1.85, 7.1, "Histogram of message length, spam vs ham");
  const h = S.by_class.ham, sp = S.by_class.spam, t = S.length_test;
  stat(s, 8.0, 1.85, 2.3, String(h.median), "ham median (chars)", HEX.cyan, 34);
  stat(s, 10.45, 1.85, 2.3, String(sp.median), "spam median (chars)", HEX.pink, 34);
  card(s, 8.0, 3.4, 4.75, 3.0, "t-test card");
  body(s, [
    { text: "Is the difference real?", options: { bold: true, fontSize: 18, breakLine: true } },
    { text: `Welch t = ${t.t.toFixed(1)}, p < 2.2e-16`, options: { color: C.accent3, breakLine: true } },
    { text: `Spam is ${Math.round(-t.ci[1])}–${Math.round(-t.ci[0])} characters longer (95% CI)`, options: { breakLine: true } },
    { text: `Ham is right-skewed: mean ${h.mean.toFixed(1)} > median ${h.median}. Spam fills one SMS (160 chars).`, options: { color: C.background2 } },
  ], 8.25, 3.6, 4.3, 2.7, 15, "t-test result");
}

// ---------------------------------------------------------------- 5 Bayes
pres.addSection({ title: "Probability" });
{
  const s = content(5, "Probability", "05 · Bayes' theorem", "The word “free”");
  const f = S.word_bayes.find((w) => w.word === "free");
  card(s, 0.6, 1.85, 6.0, 2.05, "Bayes formula card");
  body(s, [
    { text: "P(spam | free) = P(free | spam) · P(spam) / P(free)", options: { bold: true, breakLine: true } },
    { text: `= ${f.p_w_spam.toFixed(3)} × ${S.p_spam.toFixed(3)} / ${f.p_w.toFixed(3)} = `, options: { color: C.background2 } },
    { text: pct(f.p_spam_w), options: { bold: true, color: C.accent1, fontSize: 26 } },
  ], 0.85, 2.05, 5.6, 1.7, 17, "Bayes calculation");
  plot(s, "words.png", 0.6, 4.05, 6.0 * 0.85, "P(spam given word) for 15 words");
  card(s, 6.95, 1.85, 5.8, 4.85, "base rate card");
  s.addText("THE BASE-RATE TRAP", { x: 7.25, y: 2.05, w: 5.2, h: 0.35, fontSize: 13, bold: true, color: HEX.orange, charSpacing: 2, margin: 0, isTextBox: true, objectName: "base rate tag" });
  body(s, "A test that is 99% sensitive, 5% false alarms, for a disease 1 in 100 people have. You test positive. Chance you're sick?", 7.25, 2.5, 5.2, 1.2, 16, "medical question");
  s.addText("≈ 17%", { x: 7.25, y: 3.75, w: 5.2, h: 1.1, fontSize: 66, bold: true, color: HEX.pink, fontFace: "Arial", margin: 0, isTextBox: true, objectName: "medical answer" });
  body(s, "Out of 1,000 people: 10 real positives vs ~50 false ones. When the bad thing is rare, most alarms are false. That's why a filter combines every word.", 7.25, 4.95, 5.2, 1.6, 15, "base rate explanation");
}

// ---------------------------------------------------------------- 6 film
{
  const s = content(6, "Probability", "06 · Bayesian updating · Naive Bayes", "Reading, word by word");
  s.addImage({ path: path.join(__dirname, "film_crop.jpg"), x: 0.6, y: 1.8, w: 6.53, h: 4.55, objectName: "R-rendered film frame", altText: "P(spam) after each word for one spam and one ham message" });
  const steps = [
    ["01", "Prior", `Start at the base rate, P(spam) = ${pct(1 / (1 + Math.exp(-S.nb.prior_logodds)))}`, HEX.cyan],
    ["02", "Likelihood", "Each word multiplies the odds by P(word|spam) / P(word|ham)", HEX.orange],
    ["03", "Log-odds", "Add log likelihood ratios instead of multiplying tiny numbers", HEX.pink],
    ["04", "Verdict", "Spam ends at ~100%, ham at ~0%, on messages the model never saw", HEX.acid],
  ];
  steps.forEach(([n, t, d, c], i) => {
    const y = 1.8 + i * 1.12;
    card(s, 8.5, y, 4.25, 1.0, "step " + n);
    s.addText(n, { x: 8.7, y: y + 0.12, w: 0.6, h: 0.4, fontSize: 18, bold: true, color: c, margin: 0, isTextBox: true, objectName: "step number " + n });
    s.addText(t, { x: 9.3, y: y + 0.1, w: 3.3, h: 0.35, fontSize: 15, bold: true, color: C.background1, margin: 0, isTextBox: true, objectName: "step title " + n });
    s.addText(d, { x: 9.3, y: y + 0.45, w: 3.35, h: 0.5, fontSize: 11, color: HEX.muted, margin: 0, isTextBox: true, objectName: "step text " + n });
  });
  body(s, "log odds(spam | words) = log prior odds + Σ log [ P(wᵢ | spam) / P(wᵢ | ham) ]", 0.6, 6.5, 12.1, 0.45, 16, "Naive Bayes formula");
}

// ---------------------------------------------------------------- 7 Poisson
pres.addSection({ title: "Hypothesis tests" });
{
  const s = content(7, "Hypothesis tests", "07 · Poisson distribution · goodness of fit", "Spammers are predictable!");
  plot(s, "poisson.png", 0.6, 1.85, 7.1, "Exclamation marks per spam message vs Poisson");
  const P = S.poisson;
  stat(s, 8.0, 1.85, 2.3, P.spam.lambda.toFixed(2), "spam λ̂ ('!' per msg)", HEX.pink, 34);
  stat(s, 10.45, 1.85, 2.3, P.ham.lambda.toFixed(2), "ham λ̂ ('!' per msg)", HEX.cyan, 34);
  card(s, 8.0, 3.4, 4.75, 3.0, "Poisson verdict card");
  body(s, [
    { text: `Spam fits Poisson: p = ${P.spam.gof_p.toFixed(3)}`, options: { bold: true, color: C.accent1, breakLine: true } },
    { text: "Spammers use '!' at a steady, template-like rate.", options: { breakLine: true } },
    { text: `Ham doesn't: variance ≈ ${P.ham.dispersion.toFixed(1)}× the mean`, options: { bold: true, color: C.accent2, breakLine: true } },
    { text: "Most people never type '!', a few type '!!!!!'. Humans are bursty.", options: {} },
  ], 8.25, 3.6, 4.3, 2.7, 15, "Poisson verdict");
}

// ---------------------------------------------------------------- 8 chi-square
{
  const s = content(8, "Hypothesis tests", "08 · χ² test of independence · permutation test", "Could it be pure chance?");
  const rows = [
    [{ text: "clue", options: { bold: true, color: HEX.acid } }, { text: "ham", options: { bold: true, color: HEX.acid, align: "right" } }, { text: "spam", options: { bold: true, color: HEX.acid, align: "right" } }],
    ...S.chisq.table.map((r) => [r.group, { text: String(r.ham), options: { color: HEX.cyan, align: "right" } }, { text: String(r.spam), options: { color: HEX.pink, align: "right" } }]),
  ];
  s.addTable(rows, { x: 0.6, y: 1.85, w: 5.8, colW: [2.8, 1.5, 1.5], fontSize: 16, color: "ECEBF5", fill: { color: HEX.card }, border: { type: "solid", pt: 0.75, color: HEX.grid }, rowH: 0.48, objectName: "contingency table" });
  body(s, "585 of 588 messages with a phone number are spam.", 0.6, 4.4, 5.8, 0.4, 15, "table takeaway");
  stat(s, 0.6, 4.95, 2.8, Math.round(S.chisq.statistic).toLocaleString(), `observed χ² (df ${S.chisq.df})`, HEX.pink, 36);
  stat(s, 3.6, 4.95, 2.8, S.chisq.perm_max.toFixed(1), "largest of 2,000 shuffles", HEX.violet, 36);
  plot(s, "chisq.png", 6.75, 1.85, 6.0, "Permutation null distribution of chi-square");
  body(s, `Reject independence: p < 2.2e-16, Cramér's V = ${S.chisq.cramers_v.toFixed(2)} (very strong).`, 6.75, 5.65, 6.0, 0.7, 15, "chi-square verdict");
}

// ---------------------------------------------------------------- 9 edit distance
pres.addSection({ title: "The filter" });
{
  const s = content(9, "The filter", "09 · Distance metrics · dynamic programming", "FR33 PR1ZE, w1nner!!");
  plot(s, "levenshtein.png", 0.6, 1.85, 7.1, "Levenshtein distance between disguised and real spam words");
  card(s, 8.0, 1.85, 4.75, 4.5, "edit distance card");
  body(s, [
    { text: "Spammers misspell trigger words so exact matching misses them.", options: { breakLine: true } },
    { text: "Levenshtein distance = fewest single-letter edits between two words.", options: { color: C.background2, breakLine: true } },
  ], 8.25, 2.05, 4.3, 1.6, 15, "edit distance explanation");
  S.fix.slice(0, 4).forEach((f, i) => {
    s.addText([
      { text: f.word, options: { color: HEX.cyan, bold: true } },
      { text: "  →  ", options: { color: HEX.muted } },
      { text: f.nearest, options: { color: HEX.pink, bold: true } },
      { text: `   (${f.distance} edit${f.distance > 1 ? "s" : ""})`, options: { color: HEX.muted } },
    ], { x: 8.25, y: 3.75 + i * 0.6, w: 4.3, h: 0.45, fontSize: 18, fontFace: "Courier New", margin: 0, isTextBox: true, objectName: "fix " + f.word });
  });
}

// ---------------------------------------------------------------- 10 live filter
{
  const s = content(10, "The filter", "10 · Your turn · live demo", "Try to fool the filter");
  const msg = "Congratulations! You have WON a FREE holiday. Call now to claim your prize";
  const words = msg.toLowerCase().match(/[a-z0-9£$]+/g);
  let lo = MODEL.prior_logodds;
  const chips = [];
  let x = 0.6, y = 2.0;
  words.forEach((w, i) => {
    const l = MODEL.llr[w] ?? 0;
    lo += l;
    const wd = 0.22 + w.length * 0.15 + 0.45;
    if (x + wd > 8.3) { x = 0.6; y += 0.7; }
    const c = l > 0.7 ? HEX.pink : l < -0.7 ? HEX.cyan : HEX.muted;
    s.addShape(pres.ShapeType.roundRect, { x, y, w: wd, h: 0.52, rectRadius: 0.08, fill: { color: HEX.card }, line: { color: c, width: 1.25 }, objectName: "chip " + i });
    s.addText([{ text: w, options: { color: "ECEBF5" } }, { text: ` ${l > 0 ? "+" : ""}${l.toFixed(1)}`, options: { color: c, fontSize: 10 } }], { x, y, w: wd, h: 0.52, fontSize: 14, fontFace: "Courier New", align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: "chip text " + i });
    x += wd + 0.12;
  });
  const post = 1 / (1 + Math.exp(-lo));
  body(s, "Each word carries its log likelihood ratio from the model R trained: pink pushes towards spam, cyan towards ham.", 0.6, 4.3, 7.6, 0.8, 15, "chip legend");
  body(s, [
    { text: `prior log-odds ${MODEL.prior_logodds.toFixed(2)} + sum of words = `, options: { color: C.background2 } },
    { text: `${lo.toFixed(1)}`, options: { bold: true } },
  ], 0.6, 5.2, 7.6, 0.5, 15, "log-odds sum");
  card(s, 8.6, 1.85, 4.15, 3.6, "verdict card");
  s.addText("P(spam | words)", { x: 8.85, y: 2.05, w: 3.7, h: 0.35, fontSize: 13, color: HEX.muted, margin: 0, isTextBox: true, objectName: "verdict label" });
  s.addText(post > 0.999 ? ">99.9%" : pct(post), { x: 8.85, y: 2.45, w: 3.7, h: 1.1, fontSize: 60, bold: true, color: HEX.pink, fontFace: "Arial", margin: 0, isTextBox: true, objectName: "verdict value" });
  s.addShape(pres.ShapeType.roundRect, { x: 9.35, y: 3.85, w: 2.65, h: 0.62, rectRadius: 0.3, fill: { color: HEX.pink }, line: { color: HEX.pink }, objectName: "verdict pill" });
  s.addText("→ SPAM FOLDER", { x: 9.35, y: 3.85, w: 2.65, h: 0.62, fontSize: 16, bold: true, color: "07070C", align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: "verdict pill text" });
  body(s, `Live on the website: the audience types any message, and the same ${S.nb.vocab.toLocaleString()}-word model scores it instantly.`, 8.6, 5.65, 4.15, 1.1, 14, "live hint");
}

// ---------------------------------------------------------------- 11 accuracy
{
  const s = content(11, "The filter", "11 · Evaluation · ROC · expected cost", `${pct(S.nb.accuracy)} right. Is that good?`);
  const cm = S.nb.cm;
  const head = (t) => ({ text: t, options: { bold: true, color: HEX.acid, align: "center" } });
  s.addTable([
    [head(""), head("predicted spam"), head("predicted ham")],
    [{ text: "actually spam", options: { bold: true, color: HEX.acid } }, { text: `${cm.tp} caught`, options: { color: HEX.pink, align: "center" } }, { text: `${cm.fn} missed`, options: { color: HEX.muted, align: "center" } }],
    [{ text: "actually ham", options: { bold: true, color: HEX.acid } }, { text: `${cm.fp} lost`, options: { color: HEX.orange, align: "center" } }, { text: `${cm.tn.toLocaleString()} kept`, options: { color: HEX.cyan, align: "center" } }],
  ], { x: 0.6, y: 1.85, w: 6.2, colW: [1.9, 2.15, 2.15], fontSize: 16, color: "ECEBF5", fill: { color: HEX.card }, border: { type: "solid", pt: 0.75, color: HEX.grid }, rowH: 0.55, objectName: "confusion matrix" });
  stat(s, 0.6, 3.75, 3.0, S.nb.auc.toFixed(3), "AUC, Naive Bayes", HEX.acid, 36);
  stat(s, 3.8, 3.75, 3.0, S.nb.auc_len.toFixed(3), "AUC, message length only", HEX.orange, 36);
  body(s, [
    { text: "Mistakes aren't equal: losing a real message is worse than seeing one spam. ", options: { breakLine: true } },
    { text: "If a lost message costs 10× more, the cost-minimising threshold rises from 0.5 to ≈ 0.96.", options: { color: C.background2 } },
  ], 0.6, 5.3, 6.2, 1.4, 15, "expected cost");
  s.addImage({ path: img("roc.png"), x: 7.15, y: 1.85, w: 5.6, h: (5.6 * 860) / 1400, objectName: "ROC curves", altText: "ROC curves for Naive Bayes and length only" });
  body(s, `Tested on ${S.nb.n_test.toLocaleString()} messages the model never saw.`, 7.15, 5.4, 5.6, 0.4, 13, "test set note");
}

// ---------------------------------------------------------------- 12 summary
pres.addSection({ title: "Close" });
{
  const s = content(12, "Close", "12 · What R told us", "Your spam filter is a statistician");
  const free = S.word_bayes.find((w) => w.word === "free");
  const tiles = [
    ["Binomial", `${pct(S.binom.p_atleast1)} chance of spam today`, HEX.pink],
    ["t-test", "spam is ~67 chars longer", HEX.orange],
    ["Bayes", `P(spam | free) = ${pct(free.p_spam_w, 0)}`, HEX.pink],
    ["Base rate", "99% test, rare disease → 17%", HEX.pink],
    ["Poisson", "spam regular, humans bursty", HEX.cyan],
    ["χ² test", `V = ${S.chisq.cramers_v.toFixed(2)}, not chance`, HEX.violet],
    ["Edit distance", "fr33 → free in 2 edits", HEX.acid],
    ["Naive Bayes", `${pct(S.nb.accuracy)} accurate, AUC ${S.nb.auc.toFixed(2)}`, HEX.acid],
  ];
  tiles.forEach(([t, d, c], i) => {
    const x = 0.6 + (i % 4) * 3.08, y = 1.85 + Math.floor(i / 4) * 1.55;
    card(s, x, y, 2.85, 1.35, "tile " + t);
    s.addText(t, { x: x + 0.2, y: y + 0.15, w: 2.45, h: 0.4, fontSize: 16, bold: true, color: c, margin: 0, isTextBox: true, objectName: "tile title " + t });
    s.addText(d, { x: x + 0.2, y: y + 0.6, w: 2.5, h: 0.6, fontSize: 13, color: "ECEBF5", margin: 0, isTextBox: true, objectName: "tile text " + t });
  });
  body(s, [
    { text: "Bonus: the same maths protects code. ", options: { bold: true, color: C.accent3 } },
    { text: "PhishGuard.js uses Bayes, edit distance (loadsh vs lodash) and a Poisson test to catch malicious packages.", options: { color: C.background2 } },
  ], 0.6, 5.1, 9.5, 0.9, 15, "PhishGuard bonus");
  s.addText("Thank you · Questions?", { x: 0.6, y: 6.15, w: 12.1, h: 0.7, fontSize: 30, bold: true, color: HEX.pink, fontFace: "Arial", margin: 0, isTextBox: true, objectName: "thank you" });
}

(async () => {
  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("wrote", OUT);
})();
