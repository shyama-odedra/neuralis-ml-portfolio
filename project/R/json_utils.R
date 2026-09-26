# json_utils.R
# Minimal, dependency-free JSON writer used by every algorithm script.
# We avoid jsonlite so the project only needs base R + the built-in
# `stats` package -- nothing to install beyond R itself.

num <- function(x) {
  if (is.na(x) || is.nan(x) || is.infinite(x)) return("null")
  format(round(as.numeric(x), 6), scientific = FALSE, trim = TRUE)
}

str_esc <- function(s) {
  gsub('"', '\\\\"', as.character(s))
}

jstr <- function(s) paste0('"', str_esc(s), '"')

jvec_num <- function(v) paste0("[", paste(vapply(v, num, character(1)), collapse = ","), "]")

jvec_str <- function(v) paste0("[", paste(vapply(v, jstr, character(1)), collapse = ","), "]")

# rows: a matrix/data.frame where every column is numeric -> array of arrays
jpoints_num <- function(mat) {
  rows <- apply(mat, 1, function(r) jvec_num(r))
  paste0("[", paste(rows, collapse = ","), "]")
}

# builds a flat JSON object from a named list of already-encoded JSON fragments
jobj <- function(...) {
  parts <- list(...)
  names_ <- names(parts)
  body <- paste(sprintf('"%s":%s', names_, unlist(parts)), collapse = ",")
  paste0("{", body, "}")
}
