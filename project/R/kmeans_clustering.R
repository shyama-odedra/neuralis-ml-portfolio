# kmeans_clustering.R
# Unsupervised Learning: K-Means Clustering
# Segments customers by annual income & spending score.
#
# Usage: Rscript R/kmeans_clustering.R <annual_income_k> <spending_score> <k>
# Prints a single line of JSON to stdout.

suppressWarnings(suppressMessages({
  args <- commandArgs(trailingOnly = TRUE)
  script_dir <- dirname(sub("--file=", "", grep("--file=", commandArgs(trailingOnly = FALSE), value = TRUE)))
  source(file.path(script_dir, "json_utils.R"))
}))

income_in    <- as.numeric(args[1])
spending_in  <- as.numeric(args[2])
k            <- as.integer(args[3])
if (is.na(k) || k < 2) k <- 5
if (k > 8) k <- 8

df <- read.csv(file.path(script_dir, "..", "data", "mall_customers.csv"))
X <- as.matrix(df[, c("annual_income_k", "spending_score")])

set.seed(42)
km <- kmeans(X, centers = k, nstart = 25)

new_point <- c(income_in, spending_in)
dists <- apply(km$centers, 1, function(c) sqrt(sum((c - new_point)^2)))
assigned_cluster <- which.min(dists) - 1  # 0-indexed for JS

variance_explained <- km$betweenss / km$totss

points_with_cluster <- cbind(X, cluster = km$cluster - 1)

out <- jobj(
  cluster              = num(assigned_cluster),
  k                    = num(k),
  centers              = jpoints_num(km$centers),
  points               = jpoints_num(points_with_cluster),
  input_point          = jvec_num(new_point),
  variance_explained   = num(variance_explained),
  n_samples            = num(nrow(df))
)

cat(out)
