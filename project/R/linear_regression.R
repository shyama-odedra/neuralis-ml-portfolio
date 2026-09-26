# linear_regression.R
# Supervised Learning: Linear Regression
# Predicts house price from area, bedrooms, and age.
#
# Usage: Rscript R/linear_regression.R <area_sqft> <bedrooms> <age_years>
# Prints a single line of JSON to stdout.

suppressWarnings(suppressMessages({
  args <- commandArgs(trailingOnly = TRUE)
  script_dir <- dirname(sub("--file=", "", grep("--file=", commandArgs(trailingOnly = FALSE), value = TRUE)))
  source(file.path(script_dir, "json_utils.R"))
}))

area_in      <- as.numeric(args[1])
bedrooms_in  <- as.numeric(args[2])
age_in       <- as.numeric(args[3])

df <- read.csv(file.path(script_dir, "..", "data", "house_prices.csv"))

# Full multivariate model - this is what actually makes the prediction
model <- lm(price ~ area_sqft + bedrooms + age_years, data = df)

new_point <- data.frame(area_sqft = area_in, bedrooms = bedrooms_in, age_years = age_in)
prediction <- predict(model, newdata = new_point)

# Training metrics
r2   <- summary(model)$r.squared
rmse <- sqrt(mean(residuals(model)^2))
coefs <- coef(model)

# A simple univariate model (area only) purely for the illustrative 2D
# regression line on the chart -- the real prediction above uses all 3 features.
line_model <- lm(price ~ area_sqft, data = df)
area_range <- range(df$area_sqft)
line_pts <- data.frame(area_sqft = area_range)
line_pred <- predict(line_model, newdata = line_pts)

scatter <- df[, c("area_sqft", "price")]

out <- jobj(
  prediction      = num(prediction),
  r_squared       = num(r2),
  rmse            = num(rmse),
  intercept       = num(coefs["(Intercept)"]),
  coef_area       = num(coefs["area_sqft"]),
  coef_bedrooms   = num(coefs["bedrooms"]),
  coef_age        = num(coefs["age_years"]),
  scatter         = jpoints_num(scatter),
  line            = jpoints_num(data.frame(x = area_range, y = line_pred)),
  input_point     = jvec_num(c(area_in, prediction)),
  n_samples       = num(nrow(df))
)

cat(out)
