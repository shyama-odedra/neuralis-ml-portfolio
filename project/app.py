"""
Flask backend for the ML Web Portfolio project.

Responsible for:
  - Serving the homepage and the 4 algorithm pages.
  - Receiving user input from the frontend (JSON via fetch()).
  - Validating that input.
  - Calling the correct R script with subprocess, passing the input as
    command-line arguments.
  - Parsing the JSON that the R script prints to stdout and returning it
    to the frontend.

R communication approach
-------------------------
We use `subprocess.run(["Rscript", ...])` rather than Rserve or a
persistent R process. For a project like this (occasional, short-lived
requests, not high concurrency) it is the simplest and most reliable
option: no extra service to keep alive, no network port to manage, and
it fails loudly (with a clear error) if R or a package is missing.
Each R script is a small, self-contained, dependency-free program that
reads its dataset, fits/runs the model, and prints one line of JSON.
"""

import json
import subprocess
import sys
from pathlib import Path

from flask import Flask, render_template, request, jsonify

BASE_DIR = Path(__file__).resolve().parent
R_DIR = BASE_DIR / "R"

app = Flask(__name__)

# Use the same Python/R lookup as the shell. `Rscript` must be on PATH.
RSCRIPT_BIN = "Rscript"
R_TIMEOUT_SECONDS = 20


def run_r_script(script_name, args):
    """Run an R script with the given string args, return parsed JSON dict.

    Raises RuntimeError with a human-readable message on any failure, so
    routes can turn it into a clean JSON error response instead of a
    stack trace.
    """
    script_path = R_DIR / script_name
    if not script_path.exists():
        raise RuntimeError(f"R script not found: {script_name}")

    cmd = [RSCRIPT_BIN, str(script_path)] + [str(a) for a in args]

    try:
        result = subprocess.run(
            cmd,
            cwd=str(BASE_DIR),
            capture_output=True,
            text=True,
            timeout=R_TIMEOUT_SECONDS,
        )
    except FileNotFoundError:
        raise RuntimeError(
            "Rscript was not found on this system. Please install R "
            "(see README.md) and make sure 'Rscript' is on your PATH."
        )
    except subprocess.TimeoutExpired:
        raise RuntimeError("The R script took too long to respond.")

    if result.returncode != 0:
        stderr = (result.stderr or "").strip()
        raise RuntimeError(f"R script failed: {stderr[:500] or 'unknown error'}")

    stdout = (result.stdout or "").strip()
    if not stdout:
        raise RuntimeError("R script produced no output.")

    try:
        return json.loads(stdout)
    except json.JSONDecodeError:
        raise RuntimeError(f"Could not parse R output as JSON: {stdout[:300]}")


def to_float(value, name, min_v=None, max_v=None):
    try:
        v = float(value)
    except (TypeError, ValueError):
        raise ValueError(f"'{name}' must be a number.")
    if min_v is not None and v < min_v:
        raise ValueError(f"'{name}' must be at least {min_v}.")
    if max_v is not None and v > max_v:
        raise ValueError(f"'{name}' must be at most {max_v}.")
    return v


def to_int(value, name, min_v=None, max_v=None):
    try:
        v = int(value)
    except (TypeError, ValueError):
        raise ValueError(f"'{name}' must be a whole number.")
    if min_v is not None and v < min_v:
        raise ValueError(f"'{name}' must be at least {min_v}.")
    if max_v is not None and v > max_v:
        raise ValueError(f"'{name}' must be at most {max_v}.")
    return v


# ---------------------------------------------------------------- Pages ----

@app.route("/")
def home():
    return render_template("index.html")


@app.route("/linear-regression")
def page_linear_regression():
    return render_template("linear_regression.html")


@app.route("/logistic-regression")
def page_logistic_regression():
    return render_template("logistic_regression.html")


@app.route("/kmeans")
def page_kmeans():
    return render_template("kmeans.html")


@app.route("/hierarchical")
def page_hierarchical():
    return render_template("hierarchical.html")


# ---------------------------------------------------------------- API ------

@app.route("/api/linear-regression", methods=["POST"])
def api_linear_regression():
    data = request.get_json(silent=True) or {}
    try:
        area = to_float(data.get("area"), "area", 200, 10000)
        bedrooms = to_float(data.get("bedrooms"), "bedrooms", 1, 10)
        age = to_float(data.get("age"), "age", 0, 100)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    try:
        result = run_r_script("linear_regression.R", [area, bedrooms, age])
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 500

    return jsonify(result)


@app.route("/api/logistic-regression", methods=["POST"])
def api_logistic_regression():
    data = request.get_json(silent=True) or {}
    try:
        hours = to_float(data.get("hours"), "hours studied", 0, 24)
        attendance = to_float(data.get("attendance"), "attendance", 0, 100)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    try:
        result = run_r_script("logistic_regression.R", [hours, attendance])
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 500

    return jsonify(result)


@app.route("/api/kmeans", methods=["POST"])
def api_kmeans():
    data = request.get_json(silent=True) or {}
    try:
        income = to_float(data.get("income"), "annual income", 0, 200)
        spending = to_float(data.get("spending"), "spending score", 0, 100)
        k = to_int(data.get("k", 5), "number of clusters", 2, 8)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    try:
        result = run_r_script("kmeans_clustering.R", [income, spending, k])
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 500

    return jsonify(result)


@app.route("/api/hierarchical", methods=["POST"])
def api_hierarchical():
    data = request.get_json(silent=True) or {}
    try:
        k = to_int(data.get("k", 3), "number of clusters", 2, 4)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    method = data.get("method", "ward.D2")
    if method not in ("complete", "average", "ward.D2"):
        method = "ward.D2"

    try:
        result = run_r_script("hierarchical_clustering.R", [k, method])
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 500

    return jsonify(result)


@app.errorhandler(404)
def not_found(_e):
    return render_template("index.html"), 404


if __name__ == "__main__":
    print("Starting ML Web Portfolio on http://127.0.0.1:5000", file=sys.stderr)
    app.run(debug=True, port=5000)
