# hierarchical_clustering.R
# Unsupervised Learning: Hierarchical (Agglomerative) Clustering
# Uses R's built-in Iris dataset (Petal Length & Petal Width) to discover
# natural groupings, then compares them against the true species labels
# -- a nice way to show a viva panel that unsupervised learning found real
# structure without ever being told the species.
#
# Usage: Rscript R/hierarchical_clustering.R <k> <method>
#   k      : number of clusters to cut the tree into (2-4)
#   method : linkage method - "complete", "average", or "ward.D2"
# Prints a single line of JSON to stdout.

suppressWarnings(suppressMessages({
  args <- commandArgs(trailingOnly = TRUE)
  script_dir <- dirname(sub("--file=", "", grep("--file=", commandArgs(trailingOnly = FALSE), value = TRUE)))
  source(file.path(script_dir, "json_utils.R"))
}))

k      <- as.integer(args[1])
method <- as.character(args[2])
if (is.na(k) || k < 2) k <- 3
if (k > 4) k <- 4
if (!(method %in% c("complete", "average", "ward.D2"))) method <- "ward.D2"

# Subsample so the dendrogram stays legible (10 per species = 30 leaves)
set.seed(42)
idx <- unlist(lapply(split(seq_len(nrow(iris)), iris$Species), function(ix) sample(ix, 10)))
sub <- iris[idx, ]

feat <- sub[, c("Petal.Length", "Petal.Width")]
d <- dist(feat)
hc <- hclust(d, method = method)
clusters <- cutree(hc, k = k)

# Cluster purity: for each discovered cluster, how dominant is the majority species
species_int <- as.integer(sub$Species) - 1  # 0=setosa,1=versicolor,2=virginica
purity_tbl <- table(clusters, sub$Species)
purity <- sum(apply(purity_tbl, 1, max)) / nrow(sub)

points_mat <- cbind(feat, cluster = clusters - 1, species = species_int)

# hclust$merge: negative = original leaf, positive = result of an earlier merge step
# We pass it through as-is (1-indexed per R convention) and reconstruct the
# tree client-side in JavaScript.
merge_json <- paste0("[", paste(apply(hc$merge, 1, function(r) jvec_num(r)), collapse = ","), "]")

out <- jobj(
  k                = num(k),
  method           = jstr(method),
  points           = jpoints_num(points_mat),
  merge            = merge_json,
  heights          = jvec_num(hc$height),
  order            = jvec_num(hc$order),
  species_names    = jvec_str(c("setosa", "versicolor", "virginica")),
  purity           = num(purity),
  n_samples        = num(nrow(sub))
)

cat(out)
