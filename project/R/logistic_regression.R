# logistic_regression.R
# Supervised Learning: Logistic Regression
# Predicts whether a student passes based on hours studied & attendance.
#
# Usage: Rscript R/logistic_regression.R <hours_studied> <attendance_percent>
# Prints a single line of JSON to stdout.

suppressWarnings(suppressMessages({
  args <- commandArgs(trailingOnly = TRUE)
  script_dir <- dirname(sub("--file=", "", grep("--file=", commandArgs(trailingOnly = FALSE), value = TRUE)))
  source(file.path(script_dir, "json_utils.R"))
}))

hours_in <- as.numeric(args[1])
att_in   <- as.numeric(args[2])

df <- read.csv(file.path(script_dir, "..", "data", "student_performance.csv"))

model <- glm(passed ~ hours_studied + attendance_percent, data = df, family = binomial)

new_point <- data.frame(hours_studied = hours_in, attendance_percent = att_in)
prob <- as.numeric(predict(model, newdata = new_point, type = "response"))
pred_class <- if (prob >= 0.5) "Pass" else "Fail"

# Training accuracy + confusion matrix
train_prob <- predict(model, type = "response")
train_pred <- ifelse(train_prob >= 0.5, 1, 0)
accuracy <- mean(train_pred == df$passed)

tp <- sum(train_pred == 1 & df$passed == 1)
tn <- sum(train_pred == 0 & df$passed == 0)
fp <- sum(train_pred == 1 & df$passed == 0)
fn <- sum(train_pred == 0 & df$passed == 1)

# Decision boundary line: b0 + b1*hours + b2*attendance = 0  =>  attendance = -(b0+b1*hours)/b2
b <- coef(model)
hours_range <- range(df$hours_studied)
boundary_att <- -(b["(Intercept)"] + b["hours_studied"] * hours_range) / b["attendance_percent"]

pass_pts <- df[df$passed == 1, c("hours_studied", "attendance_percent")]
fail_pts <- df[df$passed == 0, c("hours_studied", "attendance_percent")]

out <- jobj(
  prediction        = jstr(pred_class),
  probability       = num(prob),
  accuracy          = num(accuracy),
  tp = num(tp), tn = num(tn), fp = num(fp), fn = num(fn),
  scatter_pass      = jpoints_num(pass_pts),
  scatter_fail      = jpoints_num(fail_pts),
  boundary          = jpoints_num(data.frame(x = hours_range, y = boundary_att)),
  input_point       = jvec_num(c(hours_in, att_in)),
  n_samples         = num(nrow(df))
)

cat(out)
