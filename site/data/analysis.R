# =============================================================================
#  How does your phone know it's spam?
#  analysis.R  -  every number and every picture on the website comes from here
#
#  Input : r/data/sms/SMSSpamCollection   (UCI SMS Spam Collection, 5,574 real SMS)
#  Output: site/data/stats.json           (numbers the website reads)
#          site/public/r/*.png            (plots), site/public/r/frames/*.jpg (film)
#
#  Run   : Rscript r/analysis.R            (base R + jsonlite)
# =============================================================================

suppressMessages(library(jsonlite))

script_dir <- local({
  a <- commandArgs(trailingOnly = FALSE)
  f <- sub("^--file=", "", a[grep("^--file=", a)])
  if (length(f)) dirname(normalizePath(f)) else getwd()
})
root    <- normalizePath(file.path(script_dir, ".."))
out_dat <- file.path(root, "site", "data")
out_img <- file.path(root, "site", "public", "r")
out_frm <- file.path(out_img, "frames")
out_thb <- file.path(out_img, "thumbs")
for (d in c(out_dat, out_img, out_frm, out_thb)) dir.create(d, recursive = TRUE, showWarnings = FALSE)

set.seed(42)

# ---- 0. load ------------------------------------------------------------------
sms <- read.delim(file.path(script_dir, "data", "sms", "SMSSpamCollection"), header = FALSE,
                  quote = "", col.names = c("label", "text"), encoding = "UTF-8",
                  stringsAsFactors = FALSE)
sms$spam   <- as.integer(sms$label == "spam")
tokenize   <- function(x) regmatches(tolower(x), gregexpr("[a-z0-9£$]+", tolower(x)))
sms$tokens <- tokenize(sms$text)
sms$chars  <- nchar(sms$text)
sms$words  <- lengths(sms$tokens)
sms$excl   <- lengths(regmatches(sms$text, gregexpr("!", sms$text)))
cat(sprintf("messages: %d   spam: %d   ham: %d\n", nrow(sms), sum(sms$spam), sum(1 - sms$spam)))

# ---- 1. descriptive statistics --------------------------------------------------
by_class <- lapply(split(sms$chars, sms$label), function(x)
  list(n = length(x), mean = mean(x), median = median(x), sd = sd(x),
       q1 = unname(quantile(x, .25)), q3 = unname(quantile(x, .75)), min = min(x), max = max(x)))
tt <- t.test(chars ~ label, data = sms)                   # Welch two-sample t-test
wt <- wilcox.test(chars ~ label, data = sms)
breaks <- seq(0, 260, by = 10)
clip   <- pmin(sms$chars, 259)
hist_ham  <- hist(clip[sms$spam == 0], breaks = breaks, plot = FALSE)$counts
hist_spam <- hist(clip[sms$spam == 1], breaks = breaks, plot = FALSE)$counts
length_test <- list(t = unname(tt$statistic), df = unname(tt$parameter), p = tt$p.value,
                    ci = unname(tt$conf.int), mean_ham = unname(tt$estimate[1]),
                    mean_spam = unname(tt$estimate[2]), wilcox_W = unname(wt$statistic), wilcox_p = wt$p.value)

# ---- 2. probability & Bayes' theorem ---------------------------------------------
p_spam <- mean(sms$spam)
has_word <- function(w) vapply(sms$tokens, function(t) w %in% t, logical(1))
probe <- c("free", "win", "prize", "claim", "txt", "call", "now", "urgent", "mobile",
           "you", "ok", "love", "home", "lol", "sorry")
word_bayes <- do.call(rbind, lapply(probe, function(w) {
  h <- has_word(w)
  pws <- mean(h[sms$spam == 1]); pwh <- mean(h[sms$spam == 0]); pw <- mean(h)
  data.frame(word = w, p_w_spam = pws, p_w_ham = pwh, p_w = pw,
             p_spam_w = pws * p_spam / pw)                 # Bayes: P(spam | word)
}))
print(word_bayes, row.names = FALSE, digits = 3)

# ---- 3. binomial: how many spam texts land in a day? ----------------------------
n_day <- 30
binom <- list(n = n_day, p = p_spam, pmf = dbinom(0:12, n_day, p_spam),
              p_atleast1 = 1 - dbinom(0, n_day, p_spam), mean = n_day * p_spam,
              sd = sqrt(n_day * p_spam * (1 - p_spam)))

# ---- 4. Poisson: exclamation marks per message ----------------------------------
fit_pois <- function(x, K = 6) {
  lambda <- mean(x)                                        # maximum-likelihood estimate
  obs <- tabulate(pmin(x, K) + 1, nbins = K + 1)
  expd <- c(dpois(0:(K - 1), lambda), ppois(K - 1, lambda, lower.tail = FALSE)) * length(x)
  # chi-square goodness of fit: merge bins until each expected count >= 5
  bo <- c(); be <- c(); ao <- 0; ae <- 0
  for (i in seq_along(expd)) {
    ao <- ao + obs[i]; ae <- ae + expd[i]
    if (ae >= 5) { bo <- c(bo, ao); be <- c(be, ae); ao <- 0; ae <- 0 }
  }
  if (ae > 0) { bo[length(bo)] <- bo[length(bo)] + ao; be[length(be)] <- be[length(be)] + ae }
  stat <- sum((bo - be)^2 / be); df <- length(bo) - 2
  list(n = length(x), lambda = lambda, variance = var(x), dispersion = var(x) / lambda,
       observed = obs, expected = expd, gof_stat = stat, gof_df = df,
       gof_p = pchisq(stat, df, lower.tail = FALSE), p_zero = mean(x == 0), p_zero_pois = dpois(0, lambda))
}
poisson <- list(spam = fit_pois(sms$excl[sms$spam == 1]), ham = fit_pois(sms$excl[sms$spam == 0]))
cat(sprintf("Poisson '!' spam: lambda %.3f disp %.2f p %.3g | ham: lambda %.3f disp %.2f p %.3g\n",
            poisson$spam$lambda, poisson$spam$dispersion, poisson$spam$gof_p,
            poisson$ham$lambda, poisson$ham$dispersion, poisson$ham$gof_p))

# ---- 5. chi-square test of independence: what's in the message x label -----------
sms$clue <- ifelse(grepl("[0-9]{5,}", sms$text), "phone number",
            ifelse(grepl("£|\\$", sms$text), "money sign",
            ifelse(grepl("http|www\\.|\\.com", sms$text, ignore.case = TRUE), "web link", "plain text")))
ct <- table(factor(sms$clue, c("phone number", "money sign", "web link", "plain text")), sms$label)
cs <- chisq.test(ct)
cramers_v <- sqrt(unname(cs$statistic) / (sum(ct) * (min(dim(ct)) - 1)))
null_dist <- replicate(2000, chisq.test(table(sms$clue, sample(sms$label)))$statistic)
chisq <- list(
  statistic = unname(cs$statistic), df = unname(cs$parameter), p = cs$p.value, cramers_v = cramers_v,
  perm_max = max(null_dist), perm_p = (sum(null_dist >= cs$statistic) + 1) / (length(null_dist) + 1),
  critical_95 = qchisq(0.95, cs$parameter),
  table = lapply(rownames(ct), function(r) list(group = r, ham = ct[r, "ham"], spam = ct[r, "spam"]))
)
print(ct); cat(sprintf("Chi-square = %.1f  df = %d  V = %.3f\n", chisq$statistic, chisq$df, cramers_v))

# ---- 6. Naive Bayes classifier, written by hand -----------------------------------
idx   <- sample(nrow(sms), round(0.7 * nrow(sms)))
train <- sms[idx, ]; test <- sms[-idx, ]
count_words <- function(tok) { t <- table(unlist(tok)); setNames(as.numeric(t), names(t)) }
cs_spam <- count_words(train$tokens[train$spam == 1])
cs_ham  <- count_words(train$tokens[train$spam == 0])
vocab   <- union(names(cs_spam), names(cs_ham))
n_s <- cs_spam[vocab]; n_s[is.na(n_s)] <- 0
n_h <- cs_ham[vocab];  n_h[is.na(n_h)] <- 0
V <- length(vocab)
lp_spam <- log((n_s + 1) / (sum(n_s) + V))                 # Laplace-smoothed P(word | spam)
lp_ham  <- log((n_h + 1) / (sum(n_h) + V))
llr     <- setNames(lp_spam - lp_ham, vocab)               # log likelihood ratio per word
prior_logodds <- log(mean(train$spam) / (1 - mean(train$spam)))

score_tokens <- function(tok) { w <- tok[tok %in% vocab]; prior_logodds + sum(llr[w]) }
logodds <- vapply(test$tokens, score_tokens, numeric(1))
post    <- 1 / (1 + exp(-logodds))                         # P(spam | words)

auc_of <- function(score, y) {
  r <- rank(score); n1 <- sum(y == 1); n0 <- sum(y == 0)
  (sum(r[y == 1]) - n1 * (n1 + 1) / 2) / (n1 * n0)
}
roc_of <- function(score, y, k = 160) {
  th <- unique(c(Inf, quantile(score, seq(1, 0, length.out = k), names = FALSE), -Inf))
  lapply(th, function(t) list(tpr = round(mean(score[y == 1] >= t), 4), fpr = round(mean(score[y == 0] >= t), 4)))
}
cm <- function(s, y, t = 0.5) {
  p <- as.integer(s >= t)
  list(tp = sum(p & y), fp = sum(p & !y), tn = sum(!p & !y), fn = sum(!p & y))
}
grp <- aggregate(test$spam, list(s = round(post, 3)), function(v) c(pos = sum(v), neg = sum(1 - v)))
nb <- list(
  n_train = nrow(train), n_test = nrow(test), vocab = V, prior_logodds = prior_logodds,
  auc = auc_of(post, test$spam), roc = roc_of(post, test$spam), cm = cm(post, test$spam),
  auc_len = auc_of(test$chars, test$spam), roc_len = roc_of(test$chars, test$spam),
  groups = lapply(seq_len(nrow(grp)), function(i) list(s = grp$s[i], pos = grp$x[i, "pos"], neg = grp$x[i, "neg"])),
  top_spam = (function(v) data.frame(word = names(v), llr = unname(v)))(head(sort(llr[n_s >= 8], decreasing = TRUE), 14)),
  top_ham  = (function(v) data.frame(word = names(v), llr = unname(v)))(head(sort(llr[n_h >= 8]), 14))
)
nb$accuracy <- with(nb$cm, (tp + tn) / (tp + tn + fp + fn))
cat(sprintf("Naive Bayes: vocab %d  accuracy %.4f  AUC %.4f  (length alone AUC %.3f)\n", V, nb$accuracy, nb$auc, nb$auc_len))
print(unlist(nb$cm))

# the whole model, so the website can classify any message the audience types
model <- list(prior_logodds = prior_logodds, llr = as.list(round(llr, 3)))

# ---- 7. edit distance: catching disguised words -----------------------------------
spam_dict <- names(sort(llr[n_s >= 5 & llr > 1.5], decreasing = TRUE))
spam_dict <- spam_dict[grepl("^[a-z]{3,}$", spam_dict)]            # real words only
disguised <- c("fr33", "w1nner", "pr1ze", "c4sh", "ur9ent", "mob1le", "cla1m", "txxt")
D <- adist(disguised, spam_dict)                           # Levenshtein distance matrix
fix <- data.frame(word = disguised, nearest = spam_dict[apply(D, 1, which.min)], distance = apply(D, 1, min))
print(fix, row.names = FALSE)
heat_cols <- unique(c("free", "winner", "prize", "cash", "urgent", "mobile", "claim", "txt"))
heat <- adist(disguised, heat_cols); dimnames(heat) <- list(disguised, heat_cols)

# ---- 8. pick two real messages for the film ---------------------------------------
tok_n <- lengths(test$tokens)
pick  <- function(cond) { i <- which(cond)[1]; test[i, ] }
film_spam <- pick(test$spam == 1 & post > 0.999 & tok_n >= 12 & tok_n <= 18 & grepl("free|win|prize|claim", tolower(test$text)))
film_ham  <- pick(test$spam == 0 & post < 0.001 & tok_n >= 12 & tok_n <= 18)
trajectory <- function(tok) {
  lo <- prior_logodds; out <- c(prior = lo); steps <- list()
  for (w in tok) {
    d <- if (w %in% vocab) llr[[w]] else 0
    lo <- lo + d
    steps[[length(steps) + 1]] <- list(word = w, llr = round(d, 3), post = 1 / (1 + exp(-lo)))
  }
  steps
}
film <- list(spam = list(text = film_spam$text, steps = trajectory(film_spam$tokens[[1]])),
             ham  = list(text = film_ham$text,  steps = trajectory(film_ham$tokens[[1]])))
cat("film spam:", film_spam$text, "\nfilm ham :", film_ham$text, "\n")

examples <- list(
  spam = head(unique(sms$text[sms$spam == 1 & sms$chars < 150]), 60),
  ham  = head(unique(sms$text[sms$spam == 0 & sms$chars > 25 & sms$chars < 110]), 60)
)

write_json(list(
  generated = format(Sys.time(), "%Y-%m-%d %H:%M"), r_version = R.version.string,
  counts = list(messages = nrow(sms), spam = sum(sms$spam), ham = sum(1 - sms$spam), vocab = V),
  p_spam = p_spam, by_class = by_class, length_test = length_test,
  hist = list(breaks = breaks, ham = hist_ham, spam = hist_spam),
  word_bayes = word_bayes, binom = binom, poisson = poisson, chisq = chisq, nb = nb,
  fix = fix, heat = list(rows = disguised, cols = heat_cols, m = unname(heat)), spam_dict = spam_dict,
  film = film, examples = examples
), file.path(out_dat, "stats.json"), auto_unbox = TRUE, digits = 6, dataframe = "rows")
write_json(model, file.path(out_dat, "model.json"), auto_unbox = TRUE, digits = 4)
file.copy(file.path(out_dat, "model.json"), file.path(script_dir, "api", "model.json"), overwrite = TRUE)  # for the R API
file.copy(file.path(script_dir, "analysis.R"), file.path(out_dat, "analysis.R"), overwrite = TRUE)      # shown on the slides
cat("wrote stats.json and model.json\n")

# ---- 9. pictures ----------------------------------------------------------------
BG <- "#07070c"; FG <- "#ecebf5"; MUTED <- "#77768c"; GRID <- "#1b1a26"
ACID <- "#c6ff3d"; PINK <- "#ff2bd6"; CYAN <- "#2de2ff"; ORANGE <- "#ff8a3d"; VIOLET <- "#9b7bff"
alpha <- function(col, a) adjustcolor(col, alpha.f = a)
glow_lines <- function(x, y, col, lwd = 3) {
  for (w in c(16, 10, 6)) lines(x, y, col = alpha(col, 0.07), lwd = lwd + w)
  lines(x, y, col = col, lwd = lwd)
}
neon_par <- function(mini = FALSE) {
  par(bg = BG, fg = MUTED, col.axis = MUTED, col.lab = FG, col.main = FG, family = "sans",
      mar = if (mini) c(1.2, 1.2, 3.2, 1.2) else c(5, 5.5, 5, 2), cex.main = if (mini) 1.1 else 1.6,
      font.main = 2, las = 1, bty = "n")
}
open_png <- function(name, w = 1400, h = 860) png(file.path(out_img, name), w, h, type = "cairo", res = 120)

plot_length <- function(mini = FALSE) {
  neon_par(mini)
  mids <- head(breaks, -1) + 5
  plot(NA, xlim = c(0, 260), ylim = c(0, max(hist_ham / sum(hist_ham), hist_spam / sum(hist_spam)) * 1.1),
       main = "Message length: spam vs ham", xlab = if (mini) "" else "characters", ylab = if (mini) "" else "share of messages",
       xaxt = if (mini) "n" else "s", yaxt = if (mini) "n" else "s")
  rect(head(breaks, -1), 0, breaks[-1], hist_ham / sum(hist_ham), col = alpha(CYAN, .3), border = CYAN)
  rect(head(breaks, -1), 0, breaks[-1], hist_spam / sum(hist_spam), col = alpha(PINK, .35), border = PINK)
  if (!mini) legend("topright", c("ham", "spam"), fill = c(alpha(CYAN, .3), alpha(PINK, .35)), border = c(CYAN, PINK), text.col = FG, bty = "n", cex = 1.1)
}
plot_words <- function(mini = FALSE) {
  neon_par(mini)
  wb <- word_bayes[order(word_bayes$p_spam_w), ]
  if (!mini) par(mar = c(5, 7, 5, 2))
  b <- barplot(wb$p_spam_w, horiz = TRUE, names.arg = if (mini) NA else wb$word, col = ifelse(wb$p_spam_w > .5, PINK, CYAN),
               border = NA, xlim = c(0, 1), main = "P(spam | word appears)", col.axis = FG, xaxt = if (mini) "n" else "s")
  abline(v = p_spam, col = ACID, lty = 2, lwd = 2)
}
plot_poisson <- function(mini = FALSE) {
  neon_par(mini)
  P <- poisson$spam; K <- length(P$observed) - 1
  b <- barplot(P$observed, names.arg = if (mini) NULL else c(0:(K - 1), paste0(K, "+")), col = alpha(CYAN, .35), border = CYAN,
               ylim = c(0, max(P$observed, P$expected) * 1.15), main = "'!' per spam message vs Poisson",
               yaxt = if (mini) "n" else "s", xlab = if (mini) "" else "exclamation marks", ylab = if (mini) "" else "messages")
  glow_lines(b, P$expected, PINK, 3); points(b, P$expected, pch = 19, col = PINK, cex = 1.3)
}
plot_null <- function(mini = FALSE) {
  neon_par(mini)
  h <- hist(null_dist, breaks = 30, plot = FALSE)
  plot(h, col = alpha(VIOLET, .45), border = VIOLET, main = "Chi-square: permutation null",
       xlab = if (mini) "" else "chi-square when labels are shuffled", ylab = "", xaxt = if (mini) "n" else "s", yaxt = "n")
  if (!mini) mtext(sprintf("observed statistic = %.0f  (null max = %.1f)", chisq$statistic, max(null_dist)), side = 3, line = .2, col = ACID, cex = 1.1)
}
plot_roc <- function(mini = FALSE) {
  neon_par(mini)
  plot(NA, xlim = c(0, 1), ylim = c(0, 1), asp = 1, xlab = if (mini) "" else "false positive rate",
       ylab = if (mini) "" else "true positive rate", main = "ROC curve", xaxt = if (mini) "n" else "s", yaxt = if (mini) "n" else "s")
  abline(h = seq(0, 1, .25), v = seq(0, 1, .25), col = GRID); abline(0, 1, col = MUTED, lty = 2)
  ra <- do.call(rbind, lapply(nb$roc_len, unlist)); rb <- do.call(rbind, lapply(nb$roc, unlist))
  glow_lines(ra[, "fpr"], ra[, "tpr"], ORANGE, 3); glow_lines(rb[, "fpr"], rb[, "tpr"], ACID, 3)
  if (!mini) legend("bottomright", c(sprintf("length only  AUC %.3f", nb$auc_len), sprintf("Naive Bayes  AUC %.3f", nb$auc)),
                    col = c(ORANGE, ACID), lwd = 4, text.col = FG, bty = "n", cex = 1.1)
}
plot_heat <- function(mini = FALSE) {
  neon_par(mini)
  if (!mini) par(mar = c(6, 7, 5, 2))
  pal <- colorRampPalette(c(PINK, VIOLET, "#1d1b33", BG))(8)
  image(1:ncol(heat), 1:nrow(heat), t(heat), col = pal, breaks = c(-.5, .5, 1.5, 2.5, 3.5, 4.5, 6.5, 9.5, 99),
        xaxt = "n", yaxt = "n", xlab = "", ylab = "", main = "Levenshtein distance  adist()")
  if (!mini) {
    axis(1, 1:ncol(heat), colnames(heat), las = 2, col.axis = FG, tick = FALSE)
    axis(2, 1:nrow(heat), rownames(heat), col.axis = FG, tick = FALSE)
    for (i in 1:nrow(heat)) for (j in 1:ncol(heat)) text(j, i, heat[i, j], col = FG, cex = 1.1)
  }
}
plot_binom <- function(mini = FALSE) {
  neon_par(mini)
  barplot(binom$pmf, names.arg = if (mini) NULL else 0:12, col = c(CYAN, rep(PINK, 12)), border = NA,
          main = sprintf("Spam texts in a day of %d", n_day), yaxt = if (mini) "n" else "s",
          xlab = if (mini) "" else "number of spam", ylab = if (mini) "" else "probability")
}
plots <- list(length = plot_length, words = plot_words, poisson = plot_poisson, chisq = plot_null,
              roc = plot_roc, levenshtein = plot_heat, binom = plot_binom)
for (nm in names(plots)) { open_png(paste0(nm, ".png")); plots[[nm]](); dev.off() }

extras <- list(
  normal   = function(m) { neon_par(m); x <- seq(-4, 4, .02); plot(x, dnorm(x), type = "n", main = "Normal", xaxt = "n", yaxt = "n", xlab = "", ylab = ""); polygon(x, dnorm(x), col = alpha(VIOLET, .3), border = NA); glow_lines(x, dnorm(x), VIOLET) },
  ecdf     = function(m) { neon_par(m); x <- 0:250; plot(x, ecdf(sms$chars[sms$spam == 1])(x), type = "n", main = "ECDF of length", xaxt = "n", yaxt = "n", xlab = "", ylab = ""); glow_lines(x, ecdf(sms$chars[sms$spam == 1])(x), PINK); glow_lines(x, ecdf(sms$chars[sms$spam == 0])(x), CYAN) },
  words_n  = function(m) { neon_par(m); boxplot(words ~ label, sms, col = c(alpha(CYAN, .4), alpha(PINK, .4)), border = c(CYAN, PINK), main = "Words per SMS", xaxt = "n", yaxt = "n", outline = FALSE) },
  beta     = function(m) { neon_par(m); x <- seq(0, 1, .005); plot(NA, xlim = 0:1, ylim = c(0, 6), main = "Beta family", xaxt = "n", yaxt = "n", xlab = "", ylab = ""); for (ab in list(c(2, 5), c(5, 2), c(9, 9))) glow_lines(x, dbeta(x, ab[1], ab[2]), c(CYAN, PINK, ACID)[sample(3, 1)]) },
  logistic = function(m) { neon_par(m); x <- seq(-8, 8, .05); plot(x, plogis(x), type = "n", main = "Log-odds -> probability", xaxt = "n", yaxt = "n", xlab = "", ylab = ""); glow_lines(x, plogis(x), ACID) },
  scores   = function(m) { neon_par(m); hist(pmin(pmax(logodds, -40), 40), breaks = 40, col = alpha(ORANGE, .5), border = ORANGE, main = "NB log-odds", xaxt = "n", yaxt = "n", xlab = "", ylab = "") },
  pois3    = function(m) { neon_par(m); k <- 0:15; plot(NA, xlim = c(0, 15), ylim = c(0, .4), main = "Poisson family", xaxt = "n", yaxt = "n", xlab = "", ylab = ""); for (l in c(1, 4, 8)) glow_lines(k, dpois(k, l), c(CYAN, ORANGE, PINK)[match(l, c(1, 4, 8))]) },
  clues    = function(m) { neon_par(m); barplot(t(prop.table(ct, 1)), col = c(CYAN, PINK), border = NA, names.arg = rep("", 4), main = "Clue vs label", yaxt = "n") },
  zipf     = function(m) { neon_par(m); f <- sort(n_h + n_s, decreasing = TRUE)[1:300]; plot(log(1:300), log(f), pch = 19, col = alpha(ACID, .7), cex = .6, main = "Zipf's law", xaxt = "n", yaxt = "n", xlab = "", ylab = "") },
  llr      = function(m) { neon_par(m); hist(llr, breaks = 50, col = alpha(PINK, .5), border = PINK, main = "Word log-LR", xaxt = "n", yaxt = "n", xlab = "", ylab = "") },
  clt      = function(m) { neon_par(m); mm <- replicate(3000, mean(sample(sms$chars, 30))); hist(mm, breaks = 30, col = alpha(ACID, .5), border = ACID, main = "CLT: sample means", xaxt = "n", yaxt = "n", xlab = "", ylab = "") },
  excl     = function(m) { neon_par(m); boxplot(excl ~ label, sms, col = c(alpha(CYAN, .4), alpha(PINK, .4)), border = c(CYAN, PINK), main = "'!' per SMS", xaxt = "n", yaxt = "n") },
  digits   = function(m) { neon_par(m); d <- lengths(regmatches(sms$text, gregexpr("[0-9]", sms$text))); plot(jitter(sms$chars), jitter(d), pch = 19, cex = .4, col = ifelse(sms$spam == 1, alpha(PINK, .6), alpha(CYAN, .25)), main = "Length vs digits", xaxt = "n", yaxt = "n", xlab = "", ylab = "") }
)
thumbs <- c(plots, extras)
for (i in seq_along(thumbs)) {
  png(file.path(out_thb, sprintf("t%02d.png", i)), 300, 425, type = "cairo", res = 96)
  thumbs[[i]](TRUE); dev.off()
}
cat(sprintf("wrote %d plots and %d thumbnails\n", length(plots), length(thumbs)))

# ---- 10. the film: a message read one word at a time ----------------------------
# Each word multiplies the odds by its likelihood ratio. Two real messages from the
# test set are read in parallel; the website scrubs these 240 frames with the scroll.
N  <- 240
S1 <- film$spam$steps; S2 <- film$ham$steps
L  <- max(length(S1), length(S2))
post_at <- function(S, k) { if (k < 1) return(plogis(prior_logodds)); S[[min(k, length(S))]]$post }
X <- function(i) 90 + i / L * 900
Y <- function(p) 130 + p * 290

draw_words <- function(S, k, y0, col) {
  x <- 90; y <- y0
  for (i in seq_along(S)) {
    w <- S[[i]]$word; wd <- strwidth(paste0(w, " "), cex = 1.55, font = 2)
    if (x + wd > 1000) { x <- 90; y <- y - 34 }
    shown <- i <= k
    cc <- if (!shown) alpha("#ffffff", .12) else if (S[[i]]$llr > 0.7) PINK else if (S[[i]]$llr < -0.7) CYAN else FG
    if (shown && i == k) rect(x - 4, y - 16, x + wd - 6, y + 18, col = alpha(cc, .18), border = cc)
    text(x, y, w, col = cc, cex = 1.55, adj = c(0, .5), font = 2)
    x <- x + wd
  }
}

for (f in 0:(N - 1)) {
  t <- f / (N - 1)
  kf <- if (t < .08) 0 else min(L, (t - .08) / .84 * L)    # fractional word position
  k  <- floor(kf)
  jpeg(file.path(out_frm, sprintf("frame_%04d.jpg", f + 1)), 1600, 900, quality = 88, type = "cairo")
  par(bg = BG, mar = c(0, 0, 0, 0), family = "sans")
  plot.new(); plot.window(c(0, 1600), c(0, 900), xaxs = "i", yaxs = "i")
  for (gx in seq(0, 1600, 40)) segments(gx, 0, gx, 900, col = alpha("#ffffff", 0.018))
  for (gy in seq(0, 900, 40))  segments(0, gy, 1600, gy, col = alpha("#ffffff", 0.018))
  # the two messages, revealed word by word
  text(90, 690, "SPAM", col = PINK, cex = 1.1, adj = 0, family = "mono", font = 2)
  draw_words(S1, k, 655, PINK)
  text(90, 565, "HAM", col = CYAN, cex = 1.1, adj = 0, family = "mono", font = 2)
  draw_words(S2, k, 530, CYAN)
  # P(spam) after each word
  for (p in c(0, .25, .5, .75, 1)) {
    segments(X(0), Y(p), X(L), Y(p), col = if (p == .5) alpha(ACID, .5) else GRID, lty = if (p == .5) 2 else 1, lwd = 1.5)
    text(X(0) - 14, Y(p), sprintf("%.2f", p), col = MUTED, adj = 1, cex = 1.1)
  }
  text(X(L), Y(.5) + 14, "threshold 0.5", col = ACID, adj = 1, cex = 1, family = "mono")
  for (pair in list(list(S = S1, col = PINK), list(S = S2, col = CYAN))) {
    ks <- 0:min(k, length(pair$S)); ps <- vapply(ks, function(j) post_at(pair$S, j), numeric(1))
    if (kf > k && k < length(pair$S)) { ks <- c(ks, kf); ps <- c(ps, ps[length(ps)] + (post_at(pair$S, k + 1) - ps[length(ps)]) * (kf - k)) }
    glow_lines(X(ks), Y(ps), pair$col, 3.5)
    points(X(ks[length(ks)]), Y(ps[length(ps)]), pch = 19, col = pair$col, cex = 2.2)
    text(X(ks[length(ks)]) + 16, Y(ps[length(ps)]), sprintf("%.1f%%", 100 * ps[length(ps)]), col = pair$col, adj = 0, cex = 1.4, font = 2)
  }
  text(X(L / 2), 92, "words read  ->", col = MUTED, cex = 1.2)
  text(X(0), 50, sprintf("prior P(spam) = %.3f   ·   each word: odds x likelihood ratio", plogis(prior_logodds)), col = MUTED, adj = 0, cex = 1.15, family = "mono")
  dev.off()
}
cat(sprintf("wrote %d film frames\n", N))
