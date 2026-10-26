# =============================================================================
#  Spam filter API  -  the trained Naive Bayes model, served live by R
#
#  model.json is written by r/analysis.R (same model the slides describe).
#  Endpoints:
#    GET  /health              -> is the server awake?
#    POST /classify {"text"}   -> P(spam | words), log-odds and every word's evidence
# =============================================================================

library(jsonlite)

model_file <- Sys.getenv("MODEL_FILE", "model.json")
model <- fromJSON(model_file, simplifyVector = TRUE)
llr   <- unlist(model$llr)
prior <- model$prior_logodds

# same tokenizer as analysis.R and the website
tokenize <- function(x) regmatches(tolower(x), gregexpr("[a-z0-9£$]+", tolower(x)))[[1]]

#* Let the website (on another domain) call this API
#* @filter cors
function(req, res) {
  res$setHeader("Access-Control-Allow-Origin", "*")
  res$setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res$setHeader("Access-Control-Allow-Headers", "Content-Type")
  if (req$REQUEST_METHOD == "OPTIONS") {
    res$status <- 200
    return(list())
  }
  plumber::forward()
}

#* Is the server awake?
#* @get /health
#* @serializer unboxedJSON
function() {
  list(ok = TRUE, words = length(llr), r = R.version.string)
}

#* Classify a text message with Naive Bayes
#* @post /classify
#* @serializer unboxedJSON
function(req, text = "") {
  if (!nzchar(text) && length(req$body$text)) text <- req$body$text
  text <- substr(as.character(text), 1, 2000)
  w <- tokenize(text)
  ev <- ifelse(w %in% names(llr), llr[w], 0)            # unseen words carry no evidence
  logodds <- prior + sum(ev)
  list(
    post    = 1 / (1 + exp(-logodds)),                    # P(spam | words)
    logodds = logodds,
    prior   = prior,
    words   = data.frame(w = w, llr = round(unname(ev), 3), known = w %in% names(llr)),
    engine  = paste0("R ", R.version$major, ".", R.version$minor, " (plumber API)")
  )
}
