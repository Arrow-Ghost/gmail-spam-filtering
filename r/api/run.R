# Start the spam filter API. Render sets PORT; locally it defaults to 8000.
setwd(dirname(normalizePath(sub("^--file=", "", grep("^--file=", commandArgs(FALSE), value = TRUE)))))
port <- as.integer(Sys.getenv("PORT", "8000"))
plumber::pr_run(plumber::pr("plumber.R"), host = "0.0.0.0", port = port)
