# Neuralis — Interactive ML Web Portfolio

A single Flask website with four interactive Machine Learning modules — two supervised, two
unsupervised — each backed by a **real R model**. No result on this site is hard-coded: every
prediction, cluster, and metric is computed live.

| Module | Type | Algorithm | Dataset |
|---|---|---|---|
| House Price Prediction | Supervised (Regression) | Linear Regression | 120 synthetic houses |
| Student Pass Prediction | Supervised (Classification) | Logistic Regression | 160 synthetic students |
| Customer Segmentation | Unsupervised (Clustering) | K-Means | 200 synthetic customers |
| Species Discovery | Unsupervised (Clustering) | Hierarchical Clustering | R's built-in `iris` dataset |

---

## 1. Project Structure

```
project/
├── app.py                     # Flask app: routes + API endpoints
├── requirements.txt
├── README.md
│
├── R/
│   ├── json_utils.R            # dependency-free JSON writer shared by all scripts
│   ├── linear_regression.R
│   ├── logistic_regression.R
│   ├── kmeans_clustering.R
│   └── hierarchical_clustering.R
│
├── data/
│   ├── house_prices.csv
│   ├── student_performance.csv
│   └── mall_customers.csv       # (Iris is built into R — no file needed)
│
├── templates/
│   ├── base.html                # shared layout (nav + footer)
│   ├── index.html               # homepage
│   ├── linear_regression.html
│   ├── logistic_regression.html
│   ├── kmeans.html
│   └── hierarchical.html
│
└── static/
    ├── css/  (style.css shared + one themed CSS file per algorithm)
    ├── js/   (main.js shared + one JS file per algorithm)
    └── assets/
```

---

## 2. How Flask and R Communicate

We use **`subprocess.run(["Rscript", ...])`** — the simplest reliable option for a project like
this (occasional, short-lived requests rather than high-concurrency traffic):

```
Browser (JS fetch)
   │  POST JSON  { area, bedrooms, age }
   ▼
Flask route  /api/linear-regression
   │  validates input, then:
   │  subprocess.run(["Rscript", "R/linear_regression.R", area, bedrooms, age])
   ▼
R script
   │  reads data/house_prices.csv
   │  fits the model (lm / glm / kmeans / hclust)
   │  computes the prediction + metrics + chart data
   │  prints ONE line of JSON to stdout
   ▼
Flask
   │  json.loads(stdout) → jsonify(...) back to the browser
   ▼
JavaScript renders the metrics + Chart.js visualization
```

Each R script is self-contained and uses **only base R + the built-in `stats` package** — no
CRAN packages (like `jsonlite`) are required, because `R/json_utils.R` hand-builds the JSON
string. This means there is nothing extra to install in R beyond R itself, which keeps setup
short and avoids version/package mismatches.

---

## 3. Setup Instructions

### Prerequisites
- Python 3.9+
- R 4.x (with `Rscript` available on your PATH)

### Install R

- **Windows:** download and install from [CRAN](https://cran.r-project.org/bin/windows/base/).
- **macOS:** `brew install r`
- **Linux (Debian/Ubuntu):** `sudo apt-get install r-base-core`

Verify with:
```bash
Rscript --version
```

### Install Python dependencies

```bash
cd project
pip install -r requirements.txt
```

### Run the app

```bash
python app.py
```

Then open **http://127.0.0.1:5000** in your browser.

---

## 4. How Each Page Works

- **Home (`/`)** — introduces the project, explains supervised vs. unsupervised learning, and
  links to the four modules.
- **`/linear-regression`** — you set area, bedrooms and age with sliders; Flask calls
  `linear_regression.R`, which fits `lm(price ~ area + bedrooms + age)` on the training data,
  predicts your house's price, and returns the training scatter plot, a simplified regression
  line, R² and RMSE.
- **`/logistic-regression`** — you set hours studied and attendance; `logistic_regression.R` fits
  `glm(passed ~ hours + attendance, family = binomial)`, returns the pass probability, predicted
  class, training accuracy, and the coordinates of the 2D decision boundary.
- **`/kmeans`** — you place a new customer and choose `k`; `kmeans_clustering.R` runs
  `kmeans()` on the customer data, finds which cluster your point is nearest to, and returns
  every point's cluster assignment for the scatter chart.
- **`/hierarchical`** — you choose `k` and a linkage method; `hierarchical_clustering.R` runs
  `hclust()` on 30 Iris flowers (10 per species), cuts the tree into `k` groups, and returns the
  full merge/height structure (used to draw a real dendrogram in the browser) plus a purity score
  comparing the discovered clusters to the true species.

---

## 5. Algorithms, In Brief

- **Linear Regression** fits the straight line/plane that minimizes squared error between
  predicted and actual prices — a supervised model for predicting a continuous number.
- **Logistic Regression** fits a sigmoid curve to output a probability between 0 and 1, then
  classifies using a 0.5 threshold — a supervised model for predicting a category.
- **K-Means** repeatedly assigns points to the nearest of `k` centers and moves each center to the
  mean of its assigned points, until stable — an unsupervised model for grouping similar points.
- **Hierarchical Clustering** starts with every point as its own cluster and repeatedly merges the
  two closest clusters, building a tree that can be cut at any height to get any number of
  clusters — another unsupervised approach, useful when you don't know `k` in advance.

---

## 6. Troubleshooting

| Problem | Fix |
|---|---|
| `Rscript was not found on this system` | Install R and confirm `Rscript --version` works in your terminal. On Windows, make sure R's `bin` folder was added to PATH during installation. |
| `R script failed: ...` | Run the script manually to see the full error, e.g. `Rscript R/linear_regression.R 1800 3 5`, from inside the `project/` folder (paths in the scripts are relative to it). |
| Port 5000 already in use | Run `python app.py` after editing the last line of `app.py` to use a different port, e.g. `app.run(debug=True, port=5050)`. |
| Charts don't appear | Check your browser console — this usually means the CDN scripts (Chart.js/AOS) didn't load, which requires an internet connection the first time you open the page. |
| Blank page / 500 error | Make sure you're running `python app.py` from inside the `project/` folder, not from elsewhere. |

---

