"""Train, evaluate and persist the four candidate models (Section IV-C)."""
import os, json, joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import (accuracy_score, precision_score, recall_score,
                             f1_score, confusion_matrix, roc_auc_score, roc_curve)

from data_generator import generate_dataset, FEATURE_ORDER, NUMERICAL, CATEGORICAL
from kaggle_dataset import (load_kaggle_dataset, KAGGLE_FEATURE_ORDER,
                            KAGGLE_NUMERICAL, KAGGLE_CATEGORICAL)
from preprocessing import build_pipeline

ART_DIR = os.path.join(os.path.dirname(__file__), "artifacts")
os.makedirs(ART_DIR, exist_ok=True)


def get_candidates():
    """The four configurations fixed in the paper, Section IV-C."""
    return {
        "Logistic Regression": LogisticRegression(max_iter=1000, random_state=42),
        "Decision Tree": DecisionTreeClassifier(max_depth=5, min_samples_leaf=8, random_state=42),
        "Random Forest": RandomForestClassifier(n_estimators=200, max_depth=8,
                                                min_samples_leaf=4, random_state=42, n_jobs=-1),
        "XGBoost": __import__("xgboost").XGBClassifier(
            n_estimators=200, max_depth=5, learning_rate=0.05,
            subsample=0.85, colsample_bytree=0.85,
            eval_metric="logloss", random_state=42, n_jobs=-1,
        ),
    }


def specificity_score(y_true, y_pred):
    cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel()
    return tn / (tn + fp) if (tn + fp) else 0.0


def evaluate(model, X_test, y_test):
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    cm = confusion_matrix(y_test, y_pred, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel()
    fpr, tpr, _ = roc_curve(y_test, y_prob)
    return {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "precision": float(precision_score(y_test, y_pred, zero_division=0)),
        "recall": float(recall_score(y_test, y_pred, zero_division=0)),
        "f1": float(f1_score(y_test, y_pred, zero_division=0)),
        "specificity": float(specificity_score(y_test, y_pred)),
        "roc_auc": float(roc_auc_score(y_test, y_prob)),
        "confusion": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
        "roc_curve": {"fpr": fpr.tolist(), "tpr": tpr.tolist()},
    }


def train_all(dataset_type: str = "kaggle"):
    if dataset_type == "kaggle":
        try:
            df = load_kaggle_dataset(n_samples=12000)
            feature_order = KAGGLE_FEATURE_ORDER
            num_cols = KAGGLE_NUMERICAL
            cat_cols = KAGGLE_CATEGORICAL
            dataset_name = "Kaggle Cardiovascular Disease Dataset (Real Clinical Cohort)"
        except Exception as e:
            print(f"Warning: Failed to load Kaggle dataset ({e}), falling back to synthetic.")
            df = generate_dataset()
            feature_order = FEATURE_ORDER
            num_cols = NUMERICAL
            cat_cols = CATEGORICAL
            dataset_name = "MedSynAI Synthetic Clinical Dataset (Paper Benchmark)"
            dataset_type = "synthetic"
    else:
        df = generate_dataset()
        feature_order = FEATURE_ORDER
        num_cols = NUMERICAL
        cat_cols = CATEGORICAL
        dataset_name = "MedSynAI Synthetic Clinical Dataset (Paper Benchmark)"

    X = df[feature_order]
    y = df["target"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, stratify=y, random_state=42)

    pre = build_pipeline(num_cols=num_cols, cat_cols=cat_cols)
    X_train_t = pre.fit_transform(X_train)   # fit on TRAIN only
    X_test_t = pre.transform(X_test)

    results = {}
    trained = {}
    for name, model in get_candidates().items():
        model.fit(X_train_t, y_train)
        results[name] = evaluate(model, X_test_t, y_test)
        trained[name] = model

    # Selected model: highest ROC-AUC
    selected_name = max(results, key=lambda k: results[k]["roc_auc"])
    selected_model = trained[selected_name]

    joblib.dump(pre, os.path.join(ART_DIR, "preprocessor.joblib"))
    joblib.dump(selected_model, os.path.join(ART_DIR, "selected_model.joblib"))
    joblib.dump(trained, os.path.join(ART_DIR, "all_models.joblib"))

    meta = {
        "dataset_type": dataset_type,
        "dataset_name": dataset_name,
        "selected_model": selected_name,
        "results": results,
        "feature_order": feature_order,
        "num_cols": num_cols,
        "cat_cols": cat_cols,
        "train_size": len(X_train),
        "test_size": len(X_test),
        "positive_rate_train": float(y_train.mean()),
    }
    with open(os.path.join(ART_DIR, "metrics.json"), "w") as f:
        json.dump(meta, f, indent=2)

    # Persist test split for SHAP global importance
    X_test.to_csv(os.path.join(ART_DIR, "X_test.csv"), index=False)
    y_test.to_csv(os.path.join(ART_DIR, "y_test.csv"), index=False)
    X_train.to_csv(os.path.join(ART_DIR, "X_train.csv"), index=False)

    # Invalidate old shap_global cache
    shap_cache = os.path.join(ART_DIR, "shap_global.json")
    if os.path.exists(shap_cache):
        os.remove(shap_cache)

    return meta


if __name__ == "__main__":
    meta = train_all("kaggle")
    print(json.dumps(meta, indent=2)[:2000])

