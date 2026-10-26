# =============================================================================
#  PhishGuard x Probability & Statistics
#  analysis.R  -  every number and every picture on the website comes from here
#
#  Input : r/data/phishguard.db   (PhishGuard's own SQLite store, demo-shop run)
#  Output: site/data/stats.json   (numbers the website reads)
#          site/public/r/*.png    (plots), site/public/r/frames/*.jpg (film)
#
#  Run   : Rscript r/analysis.R
# =============================================================================

suppressMessages({
  library(DBI)
  library(RSQLite)
  library(jsonlite)
})

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
con <- dbConnect(SQLite(), file.path(script_dir, "data", "phishguard.db"))

logs <- dbGetQuery(con, "
  SELECT timestamp, source_package, action, status, api, target_domain, key_name, session_id
  FROM security_logs ORDER BY timestamp")

latest <- dbGetQuery(con, "SELECT * FROM scans ORDER BY ran_at DESC LIMIT 1")
pk  <- dbGetQuery(con, sprintf("SELECT * FROM scan_packages WHERE scan_id = '%s'", latest$id))
fi  <- dbGetQuery(con, sprintf("SELECT * FROM scan_findings WHERE scan_id = '%s'", latest$id))
pos <- dbGetQuery(con, "SELECT captured_at, source, score FROM posture_snapshots ORDER BY captured_at")
dbDisconnect(con)

logs$flagged <- as.integer(logs$status == "FLAGGED")
cat(sprintf("events: %d   packages in scan: %d   findings: %d\n", nrow(logs), nrow(pk), nrow(fi)))

# ---- 1. descriptive statistics --------------------------------------------------
risk <- pk$risk_score
desc <- list(
  n = length(risk), mean = mean(risk), median = median(risk), sd = sd(risk),
  var = var(risk), iqr = IQR(risk), min = min(risk), max = max(risk),
  quartiles = unname(quantile(risk, c(.25, .5, .75)))
)
by_cat <- lapply(split(risk, pk$category), function(x)
  list(n = length(x), mean = mean(x), median = median(x), sd = if (length(x) > 1) sd(x) else 0,
       min = min(x), max = max(x), values = x))

# direct vs transitive dependencies: is there a difference in risk?
tt <- t.test(risk_score ~ is_direct, data = pk)        # Welch two-sample t-test
wt <- suppressWarnings(wilcox.test(risk_score ~ is_direct, data = pk))
direct_test <- list(
  mean_transitive = unname(tt$estimate[1]), mean_direct = unname(tt$estimate[2]),
  t = unname(tt$statistic), df = unname(tt$parameter), p = tt$p.value,
  ci = unname(tt$conf.int), wilcox_W = unname(wt$statistic), wilcox_p = wt$p.value,
  n_direct = sum(pk$is_direct == 1), n_transitive = sum(pk$is_direct == 0)
)

findings_tab <- as.data.frame(table(type = fi$type, severity = fi$severity))
findings_tab <- findings_tab[findings_tab$Freq > 0, ]

# ---- 2. probability & Bayes' theorem ---------------------------------------------
p_flag <- mean(logs$flagged)
pkg <- aggregate(flagged ~ source_package, data = logs, FUN = function(x) c(n = length(x), k = sum(x)))
pkg <- data.frame(package = pkg$source_package, n = pkg$flagged[, "n"], k = pkg$flagged[, "k"])
pkg$p_pkg          <- pkg$n / nrow(logs)                 # P(package)
pkg$p_flag_given   <- pkg$k / pkg$n                      # P(flagged | package)
pkg$p_given_flag   <- pkg$p_flag_given * pkg$p_pkg / p_flag   # Bayes: P(package | flagged)
# Beta-Binomial posterior with a uniform Beta(1,1) prior
pkg$post_a   <- 1 + pkg$k
pkg$post_b   <- 1 + pkg$n - pkg$k
pkg$post_mean <- pkg$post_a / (pkg$post_a + pkg$post_b)
pkg$ci_lo    <- qbeta(0.025, pkg$post_a, pkg$post_b)
pkg$ci_hi    <- qbeta(0.975, pkg$post_a, pkg$post_b)
pkg <- pkg[order(-pkg$p_flag_given, -pkg$n), ]
print(pkg[, c("package", "n", "k", "p_flag_given", "p_given_flag")], row.names = FALSE)

# Binomial view of a dependency tree: P(at least one bad package) = 1 - (1 - p)^n
p_bad_scan <- mean(pk$category == "critical")
binom <- list(
  n_packages = nrow(pk), n_critical = sum(pk$category == "critical"), p_bad = p_bad_scan,
  curve = lapply(c(10, 50, 100, 250, 500, 1000, 2000), function(n)
    list(n = n, p = 1 - (1 - 0.001)^n))
)

# ---- 3. Poisson model of flagged events per minute ------------------------------
logs$minute <- substr(logs$timestamp, 1, 16)
per_min <- tapply(logs$flagged, logs$minute, sum)       # every active minute, zeros included
all_min <- tapply(logs$flagged, logs$minute, length)
lambda  <- mean(per_min)                                # maximum-likelihood estimate of lambda
kmax    <- max(per_min)
obs     <- tabulate(per_min + 1, nbins = kmax + 1)
expd    <- dpois(0:kmax, lambda) * length(per_min)
expd[kmax + 1] <- ppois(kmax - 1, lambda, lower.tail = FALSE) * length(per_min)  # tail bin

# chi-square goodness of fit: merge bins until each expected count >= 5
merge_bins <- function(o, e) {
  bo <- c(); be <- c(); acc_o <- 0; acc_e <- 0
  for (i in seq_along(e)) {
    acc_o <- acc_o + o[i]; acc_e <- acc_e + e[i]
    if (acc_e >= 5) { bo <- c(bo, acc_o); be <- c(be, acc_e); acc_o <- 0; acc_e <- 0 }
  }
  if (acc_e > 0) { bo[length(bo)] <- bo[length(bo)] + acc_o; be[length(be)] <- be[length(be)] + acc_e }
  list(o = bo, e = be)
}
mb <- merge_bins(obs, expd)
gof_stat <- sum((mb$o - mb$e)^2 / mb$e)
gof_df   <- length(mb$o) - 1 - 1                       # minus one for the estimated lambda
gof_p    <- pchisq(gof_stat, gof_df, lower.tail = FALSE)
alarm_k  <- min(which(ppois(0:50 - 1, lambda, lower.tail = FALSE) < 0.01)) - 1   # P(X >= k) < 1%
poisson <- list(
  minutes = length(per_min), lambda = lambda, variance = var(as.numeric(per_min)),
  dispersion = var(as.numeric(per_min)) / lambda, observed = obs, expected = expd,
  gof_stat = gof_stat, gof_df = gof_df, gof_p = gof_p, alarm_k = alarm_k,
  p_alarm = ppois(alarm_k - 1, lambda, lower.tail = FALSE),
  events_per_min_mean = mean(all_min), series = as.integer(per_min)
)
cat(sprintf("Poisson lambda = %.3f  dispersion = %.2f  GOF chi2 = %.2f (df %d) p = %.4f\n",
            lambda, poisson$dispersion, gof_stat, gof_df, gof_p))

# ---- 4. chi-square test of independence: package x status ----------------------
ct <- table(logs$source_package, logs$status)
cs <- suppressWarnings(chisq.test(ct))
cramers_v <- sqrt(unname(cs$statistic) / (sum(ct) * (min(dim(ct)) - 1)))
perm_stat <- function(lbl) suppressWarnings(chisq.test(table(logs$source_package, lbl))$statistic)
null_dist <- replicate(2000, perm_stat(sample(logs$status)))
chisq <- list(
  statistic = unname(cs$statistic), df = unname(cs$parameter), p = cs$p.value,
  cramers_v = cramers_v, perm_max = max(null_dist), perm_mean = mean(null_dist),
  perm_p = (sum(null_dist >= cs$statistic) + 1) / (length(null_dist) + 1),
  null_hist = hist(null_dist, breaks = 30, plot = FALSE)[c("breaks", "counts")],
  critical_95 = qchisq(0.95, cs$parameter),
  table = lapply(rownames(ct), function(r) list(package = r, allowed = ct[r, "ALLOWED"], flagged = ct[r, "FLAGGED"]))
)
cat(sprintf("Chi-square = %.1f  df = %d  V = %.3f\n", chisq$statistic, chisq$df, cramers_v))

# ---- 5. Naive Bayes classifier (built by hand) ----------------------------------
logs$domain_party <- ifelse(is.na(logs$target_domain) | logs$target_domain == "", "none",
                     ifelse(grepl("demo-shop\\.test$", logs$target_domain), "first-party", "third-party"))
logs$key_class <- ifelse(is.na(logs$key_name), "none",
                  ifelse(logs$key_name %in% c("auth_token"), "sensitive", "ordinary"))

idx   <- sample(nrow(logs), round(0.7 * nrow(logs)))
train <- logs[idx, ]
test  <- logs[-idx, ]

fit_nb <- function(df, feats, alpha = 1) {
  prior <- table(factor(df$flagged, levels = 0:1))
  lik <- lapply(feats, function(f) {
    lv <- sort(unique(logs[[f]]))
    t  <- table(factor(df[[f]], levels = lv), factor(df$flagged, levels = 0:1))
    sweep(t + alpha, 2, colSums(t) + alpha * length(lv), "/")    # Laplace smoothing
  })
  names(lik) <- feats
  list(prior = prior / sum(prior), lik = lik, feats = feats)
}
predict_nb <- function(m, df) {
  lp1 <- log(m$prior["1"]); lp0 <- log(m$prior["0"])
  s1 <- rep(lp1, nrow(df)); s0 <- rep(lp0, nrow(df))
  for (f in m$feats) {
    s1 <- s1 + log(m$lik[[f]][df[[f]], "1"])
    s0 <- s0 + log(m$lik[[f]][df[[f]], "0"])
  }
  1 / (1 + exp(s0 - s1))                                   # P(flagged | evidence)
}
auc_of <- function(score, y) {                             # AUC = Mann-Whitney U / (n1 * n0)
  r <- rank(score); n1 <- sum(y == 1); n0 <- sum(y == 0)
  (sum(r[y == 1]) - n1 * (n1 + 1) / 2) / (n1 * n0)
}
roc_of <- function(score, y) {
  th <- sort(unique(c(Inf, score, -Inf)), decreasing = TRUE)
  lapply(th, function(t) list(t = ifelse(is.finite(t), t, ifelse(t > 0, 1.0001, -0.0001)),
                              tpr = mean(score[y == 1] >= t), fpr = mean(score[y == 0] >= t)))
}
grouped <- function(score, y) {                            # unique scores -> counts, for the slider
  g <- aggregate(y, list(s = round(score, 6)), function(v) c(pos = sum(v), neg = sum(1 - v)))
  lapply(seq_len(nrow(g)), function(i) list(s = g$s[i], pos = g$x[i, "pos"], neg = g$x[i, "neg"]))
}

mA <- fit_nb(train, c("api"))
mB <- fit_nb(train, c("api", "domain_party", "key_class", "source_package"))
sA <- predict_nb(mA, test); sB <- predict_nb(mB, test)
cm <- function(s, y, t = 0.5) {
  p <- as.integer(s >= t)
  list(tp = sum(p == 1 & y == 1), fp = sum(p == 1 & y == 0), tn = sum(p == 0 & y == 0), fn = sum(p == 0 & y == 1))
}
lik_json <- function(m) lapply(m$lik, function(t)
  lapply(setNames(rownames(t), rownames(t)), function(r) list(p1 = t[r, "1"], p0 = t[r, "0"])))
nb <- list(
  n_train = nrow(train), n_test = nrow(test), prior = as.list(unclass(mB$prior)),
  A = list(feats = mA$feats, auc = auc_of(sA, test$flagged), roc = roc_of(sA, test$flagged),
           groups = grouped(sA, test$flagged), cm = cm(sA, test$flagged)),
  B = list(feats = mB$feats, auc = auc_of(sB, test$flagged), roc = roc_of(sB, test$flagged),
           groups = grouped(sB, test$flagged), cm = cm(sB, test$flagged), lik = lik_json(mB))
)
cat(sprintf("Naive Bayes AUC  model A (api only) = %.3f   model B (4 features) = %.3f\n", nb$A$auc, nb$B$auc))

# ---- 6. typosquatting: edit distance with base R adist() ------------------------
popular <- fromJSON(file.path(script_dir, "data", "popular-packages.json"))
deps    <- unique(pk$name)
D <- adist(deps, popular)                                   # Levenshtein distance matrix
best <- apply(D, 1, function(r) { j <- which.min(r); c(popular[j], r[j]) })
typo <- data.frame(dep = deps, nearest = best[1, ], distance = as.integer(best[2, ]))
typo <- typo[typo$distance > 0 & typo$distance <= 2, ]
heat_targets <- unique(c("lodash", "chalk", "axios", "express", "react", "request", typo$nearest))
heat_deps    <- unique(c("loadsh", "chalk-next", "axios", "express", "lodash", typo$dep))
heat <- adist(heat_deps, heat_targets); dimnames(heat) <- list(heat_deps, heat_targets)

# ---- 7. posture: weighted mean of exponentially-decaying bands ------------------
posture <- list(
  score = latest$score, grade = latest$grade, status = latest$status,
  bands = list(list(key = "vulnerability", w = .35, k = 45), list(key = "exploitability", w = .25, k = 40),
               list(key = "supplyChain", w = .20, k = 38), list(key = "maintenance", w = .12, k = 30),
               list(key = "runtime", w = .08, k = 35)),
  history = lapply(seq_len(nrow(pos)), function(i) list(at = pos$captured_at[i], source = pos$source[i], score = pos$score[i]))
)

write_json(list(
  generated = format(Sys.time(), "%Y-%m-%d %H:%M"), r_version = R.version.string,
  counts = list(events = nrow(logs), flagged = sum(logs$flagged), packages = nrow(pk),
                findings = nrow(fi), sessions = length(unique(logs$session_id)),
                vulnerable = latest$vulnerable_count, direct = latest$direct_count),
  desc = desc, by_cat = by_cat, direct_test = direct_test,
  findings = lapply(seq_len(nrow(findings_tab)), function(i) as.list(findings_tab[i, ])),
  packages = lapply(seq_len(nrow(pk)), function(i) list(name = pk$name[i], version = pk$version[i],
                    direct = pk$is_direct[i] == 1, depth = pk$depth[i], risk = pk$risk_score[i], category = pk$category[i])),
  p_flag = p_flag, by_package = pkg, binom = binom, poisson = poisson, chisq = chisq,
  nb = nb, typo = typo, heat = list(rows = heat_deps, cols = heat_targets, m = unname(heat)),
  posture = posture
), file.path(out_dat, "stats.json"), auto_unbox = TRUE, digits = 6, pretty = FALSE, dataframe = "rows")
file.copy(file.path(script_dir, "data", "popular-packages.json"), file.path(out_dat, "popular-packages.json"), overwrite = TRUE)
cat("wrote stats.json\n")

# ---- 8. pictures ----------------------------------------------------------------
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
grid_y <- function() abline(h = axTicks(2), col = GRID, lwd = 1)

plot_risk <- function(mini = FALSE) {
  neon_par(mini)
  cats <- c("safe", "warning", "critical"); cols <- c(CYAN, ORANGE, PINK)
  plot(NA, xlim = c(0.4, 3.6), ylim = c(0, 105), xaxt = "n", yaxt = if (mini) "n" else "s",
       xlab = "", ylab = if (mini) "" else "risk score (0-100)", main = "Risk score by category")
  grid_y()
  for (i in 1:3) {
    v <- pk$risk_score[pk$category == cats[i]]
    q <- quantile(v, c(.25, .5, .75))
    rect(i - .28, q[1], i + .28, q[3], col = alpha(cols[i], .18), border = cols[i], lwd = 2)
    segments(i - .28, q[2], i + .28, q[2], col = cols[i], lwd = 4)
    points(i + runif(length(v), -.2, .2), v, pch = 19, col = alpha(cols[i], .85), cex = if (mini) .8 else 1.3)
  }
  if (!mini) axis(1, 1:3, cats, col.axis = FG, tick = FALSE, cex.axis = 1.2)
}
plot_flagrate <- function(mini = FALSE) {
  neon_par(mini)
  d <- pkg[order(pkg$post_mean), ]
  if (!mini) par(mar = c(5, 11, 5, 2))
  y <- seq_len(nrow(d))
  plot(NA, xlim = c(0, 1), ylim = c(.5, nrow(d) + .5), yaxt = "n", xaxt = if (mini) "n" else "s",
       xlab = if (mini) "" else "P(flagged | package)  with 95% Beta credible interval", ylab = "",
       main = "Flag rate per package")
  abline(v = seq(0, 1, .25), col = GRID)
  segments(d$ci_lo, y, d$ci_hi, y, col = PINK, lwd = 6)
  points(d$post_mean, y, pch = 21, bg = ACID, col = BG, cex = 2)
  if (!mini) axis(2, y, d$package, col.axis = FG, tick = FALSE, cex.axis = 1.05)
}
plot_poisson <- function(mini = FALSE) {
  neon_par(mini)
  k <- 0:kmax
  b <- barplot(obs, names.arg = if (mini) NULL else k, col = alpha(CYAN, .35), border = CYAN,
               ylim = c(0, max(obs, expd) * 1.15), main = "Flagged events / minute vs Poisson",
               xlab = if (mini) "" else "flagged events in one minute", ylab = if (mini) "" else "minutes",
               yaxt = if (mini) "n" else "s", col.axis = MUTED)
  glow_lines(b, expd, PINK, 3); points(b, expd, pch = 19, col = PINK, cex = 1.3)
  if (!mini) legend("topright", c("observed", sprintf("Poisson(%.2f)", lambda)), fill = c(alpha(CYAN, .35), NA),
                    border = c(CYAN, NA), col = c(NA, PINK), lwd = c(NA, 3), pch = c(NA, 19),
                    text.col = FG, bty = "n", cex = 1.1)
}
plot_null <- function(mini = FALSE) {
  neon_par(mini)
  h <- hist(null_dist, breaks = 30, plot = FALSE)
  plot(h, col = alpha(VIOLET, .45), border = VIOLET, main = "Chi-square: permutation null",
       xlab = if (mini) "" else "chi-square statistic when labels are shuffled", ylab = if (mini) "" else "count",
       xaxt = if (mini) "n" else "s", yaxt = if (mini) "n" else "s")
  if (!mini) mtext(sprintf("observed statistic = %.0f   (null max = %.1f)  ->  off the chart", chisq$statistic, max(null_dist)),
                   side = 3, line = .2, col = ACID, cex = 1.1)
}
plot_roc <- function(mini = FALSE) {
  neon_par(mini)
  plot(NA, xlim = c(0, 1), ylim = c(0, 1), asp = 1, xlab = if (mini) "" else "false positive rate",
       ylab = if (mini) "" else "true positive rate", main = "ROC: Naive Bayes",
       xaxt = if (mini) "n" else "s", yaxt = if (mini) "n" else "s")
  abline(h = seq(0, 1, .25), v = seq(0, 1, .25), col = GRID); abline(0, 1, col = MUTED, lty = 2)
  ra <- do.call(rbind, lapply(nb$A$roc, unlist)); rb <- do.call(rbind, lapply(nb$B$roc, unlist))
  glow_lines(ra[, "fpr"], ra[, "tpr"], ORANGE, 3); glow_lines(rb[, "fpr"], rb[, "tpr"], ACID, 3)
  if (!mini) legend("bottomright", c(sprintf("api only   AUC %.3f", nb$A$auc), sprintf("4 features AUC %.3f", nb$B$auc)),
                    col = c(ORANGE, ACID), lwd = 4, text.col = FG, bty = "n", cex = 1.1)
}
plot_heat <- function(mini = FALSE) {
  neon_par(mini)
  if (!mini) par(mar = c(7, 9, 5, 2))
  pal <- colorRampPalette(c(PINK, VIOLET, "#1d1b33", BG))(8)
  image(1:ncol(heat), 1:nrow(heat), t(heat), col = pal, breaks = c(-.5, .5, 1.5, 2.5, 3.5, 4.5, 6.5, 9.5, 99),
        xaxt = "n", yaxt = "n", xlab = "", ylab = "", main = "Levenshtein distance  adist()")
  if (!mini) {
    axis(1, 1:ncol(heat), colnames(heat), las = 2, col.axis = FG, tick = FALSE)
    axis(2, 1:nrow(heat), rownames(heat), col.axis = FG, tick = FALSE)
    for (i in 1:nrow(heat)) for (j in 1:ncol(heat)) text(j, i, heat[i, j], col = FG, cex = 1.1)
  }
}
plot_decay <- function(mini = FALSE) {
  neon_par(mini)
  x <- seq(0, 200, length.out = 400)
  plot(NA, xlim = c(0, 200), ylim = c(0, 100), xlab = if (mini) "" else "penalty points",
       ylab = if (mini) "" else "band score", main = "Band score = 100 e^(-penalty / k)",
       xaxt = if (mini) "n" else "s", yaxt = if (mini) "n" else "s")
  grid_y()
  ks <- c(30, 38, 45); cols <- c(PINK, ACID, CYAN)
  for (i in 1:3) glow_lines(x, 100 * exp(-x / ks[i]), cols[i], 3)
  if (!mini) legend("topright", paste("k =", ks), col = cols, lwd = 4, text.col = FG, bty = "n", cex = 1.1)
}

plots <- list(risk = plot_risk, flagrate = plot_flagrate, poisson = plot_poisson, chisq = plot_null,
              roc = plot_roc, levenshtein = plot_heat, decay = plot_decay)
for (nm in names(plots)) { open_png(paste0(nm, ".png")); plots[[nm]](); dev.off() }

# small extra plots for the opening card fan
extras <- list(
  normal   = function(m) { neon_par(m); x <- seq(-4, 4, .02); plot(x, dnorm(x), type = "n", main = "Normal", xaxt = "n", yaxt = "n", xlab = "", ylab = ""); polygon(x, dnorm(x), col = alpha(VIOLET, .3), border = NA); glow_lines(x, dnorm(x), VIOLET) },
  binom    = function(m) { neon_par(m); n <- 0:20; barplot(dbinom(n, 20, .3), col = ORANGE, border = NA, main = "Binomial", yaxt = "n") },
  ecdf     = function(m) { neon_par(m); e <- ecdf(pk$risk_score); x <- 0:100; plot(x, e(x), type = "n", main = "ECDF of risk", xaxt = "n", yaxt = "n", xlab = "", ylab = ""); glow_lines(x, e(x), CYAN) },
  qq       = function(m) { neon_par(m); q <- qqnorm(pk$risk_score, plot.it = FALSE); plot(q, pch = 19, col = ACID, main = "Q-Q plot", xaxt = "n", yaxt = "n", xlab = "", ylab = ""); abline(mean(pk$risk_score), sd(pk$risk_score), col = PINK, lwd = 2) },
  sessions = function(m) { neon_par(m); s <- table(logs$session_id); hist(as.numeric(s), col = alpha(PINK, .5), border = PINK, main = "Events / session", xaxt = "n", yaxt = "n", xlab = "", ylab = "") },
  beta     = function(m) { neon_par(m); x <- seq(0, 1, .005); plot(NA, xlim = 0:1, ylim = c(0, 6), main = "Beta family", xaxt = "n", yaxt = "n", xlab = "", ylab = ""); for (ab in list(c(2, 5), c(5, 2), c(9, 9))) glow_lines(x, dbeta(x, ab[1], ab[2]), sample(c(CYAN, PINK, ACID), 1)) },
  logistic = function(m) { neon_par(m); x <- seq(-6, 6, .05); plot(x, plogis(x), type = "n", main = "Logistic", xaxt = "n", yaxt = "n", xlab = "", ylab = ""); glow_lines(x, plogis(x), ACID) },
  cumul    = function(m) { neon_par(m); y <- cumsum(logs$flagged); plot(y, type = "n", main = "Cumulative flags", xaxt = "n", yaxt = "n", xlab = "", ylab = ""); glow_lines(seq_along(y), y, PINK) },
  pois3    = function(m) { neon_par(m); k <- 0:15; plot(NA, xlim = c(0, 15), ylim = c(0, .4), main = "Poisson family", xaxt = "n", yaxt = "n", xlab = "", ylab = ""); for (l in c(1, 4, 8)) glow_lines(k, dpois(k, l), c(CYAN, ORANGE, PINK)[match(l, c(1, 4, 8))]) },
  findings = function(m) { neon_par(m); t <- sort(table(fi$type)); barplot(t, horiz = TRUE, col = c(CYAN, VIOLET, ORANGE, PINK, ACID, CYAN)[seq_along(t)], border = NA, names.arg = NA, main = "Findings by type", xaxt = "n") },
  severity = function(m) { neon_par(m); t <- table(factor(fi$severity, c("low", "moderate", "high", "critical"))); barplot(t, col = c(CYAN, ACID, ORANGE, PINK), border = NA, names.arg = NA, main = "Severity", yaxt = "n") },
  scatter  = function(m) { neon_par(m); s <- aggregate(flagged ~ session_id, logs, function(v) c(length(v), sum(v))); plot(s$flagged[, 1], s$flagged[, 2], pch = 19, col = alpha(CYAN, .7), main = "Session: events vs flags", xaxt = "n", yaxt = "n", xlab = "", ylab = "") },
  clt      = function(m) { neon_par(m); mm <- replicate(3000, mean(sample(pk$risk_score, 10, TRUE))); hist(mm, breaks = 30, col = alpha(ACID, .5), border = ACID, main = "CLT: sample means", xaxt = "n", yaxt = "n", xlab = "", ylab = "") }
)
thumbs <- c(plots, extras)
for (i in seq_along(thumbs)) {
  png(file.path(out_thb, sprintf("t%02d.png", i)), 300, 425, type = "cairo", res = 96)
  thumbs[[i]](TRUE); dev.off()
}
cat(sprintf("wrote %d plots and %d thumbnails\n", length(plots), length(thumbs)))

# ---- 9. the film: Bayesian updating, one frame at a time ------------------------
# Events stream in chronologically. For each package we keep a Beta(1 + k, 1 + n - k)
# posterior on its flag rate and redraw it. 240 frames, scrubbed by the website's scroll.
film_pk  <- c("axios", "chalk-next", "event-stream")
film_col <- c(CYAN, PINK, ACID)
ev <- logs[logs$source_package %in% film_pk, c("source_package", "flagged")]
N  <- 240
xs <- seq(0.0005, 0.9995, length.out = 600)
X  <- function(x) 90 + x * 900
Y  <- function(h) 150 + h * 430

for (f in 0:(N - 1)) {
  t   <- f / (N - 1)
  upto <- if (t < 0.06) 0 else round(((t - 0.06) / 0.94)^2.2 * nrow(ev))
  seen <- ev[seq_len(upto), , drop = FALSE]
  jpeg(file.path(out_frm, sprintf("frame_%04d.jpg", f + 1)), 1600, 900, quality = 88, type = "cairo")
  par(bg = BG, mar = c(0, 0, 0, 0), family = "sans")
  plot.new(); plot.window(c(0, 1600), c(0, 900), xaxs = "i", yaxs = "i")
  # backdrop grid
  for (gx in seq(0, 1600, 40)) segments(gx, 0, gx, 900, col = alpha("#ffffff", 0.018))
  for (gy in seq(0, 900, 40))  segments(0, gy, 1600, gy, col = alpha("#ffffff", 0.018))
  for (v in seq(0, 1, .25)) {
    segments(X(v), Y(0), X(v), Y(1.02), col = GRID, lwd = 1.5)
    text(X(v), Y(0) - 28, sprintf("%.2f", v), col = MUTED, cex = 1.3)
  }
  segments(X(0), Y(0), X(1), Y(0), col = MUTED, lwd = 2)
  text(X(.5), Y(0) - 66, "flag rate  theta  =  P(flagged | package)", col = FG, cex = 1.45)
  for (i in seq_along(film_pk)) {
    s <- seen[seen$source_package == film_pk[i], ]
    a <- 1 + sum(s$flagged); b <- 1 + nrow(s) - sum(s$flagged)
    d <- dbeta(xs, a, b); h <- d / max(d)
    polygon(c(X(xs), X(1), X(0)), c(Y(h), Y(0), Y(0)), col = alpha(film_col[i], 0.10), border = NA)
    glow_lines(X(xs), Y(h), film_col[i], 3.5)
    m  <- a / (a + b)
    tx <- c(X(.0), X(.36), X(.72))[i]
    rect(tx, 683, tx + 14, 697, col = film_col[i], border = NA)
    text(tx + 26, 690, film_pk[i], col = film_col[i], cex = 1.5, adj = c(0, .5), font = 2)
    text(tx, 655, sprintf("Beta(%d, %d)", a, b), col = FG, cex = 1.15, adj = 0, family = "mono")
    text(tx, 628, sprintf("E[theta] = %.3f", m), col = MUTED, cex = 1.15, adj = 0, family = "mono")
    points(X(m), Y(0), pch = 17, col = film_col[i], cex = 2)
  }
  # the live event stream along the bottom
  tail_ev <- tail(seen, 120)
  if (nrow(tail_ev)) {
    xx <- seq(X(0), X(1), length.out = 120)[seq_len(nrow(tail_ev))]
    cc <- film_col[match(tail_ev$source_package, film_pk)]
    points(xx, rep(38, length(xx)), pch = ifelse(tail_ev$flagged == 1, 15, 16),
           col = ifelse(tail_ev$flagged == 1, cc, alpha(cc, .35)), cex = ifelse(tail_ev$flagged == 1, 1.6, 1))
  }
  text(X(0), 70, sprintf("events observed  n = %s", format(upto, big.mark = ",")), col = MUTED, adj = 0, cex = 1.15, family = "mono")
  text(X(1), 70, "R  dbeta()  qbeta()", col = MUTED, adj = 1, cex = 1.15, family = "mono")
  dev.off()
}
cat(sprintf("wrote %d film frames\n", N))
