"""SHAP explainability: global mean |SHAP| and per-record contributions."""
import os, json
import numpy as np
import joblib
import shap
import pandas as pd

from data_generator import FEATURE_ORDER, CATEGORICAL, NUMERICAL

ART_DIR = os.path.join(os.path.dirname(__file__), "artifacts")


def _load(model_name: str = None):
    pre = joblib.load(os.path.join(ART_DIR, "preprocessor.joblib"))
    if model_name:
        all_models = joblib.load(os.path.join(ART_DIR, "all_models.joblib"))
        model = all_models.get(model_name)
        if model is None:
            model = joblib.load(os.path.join(ART_DIR, "selected_model.joblib"))
    else:
        model = joblib.load(os.path.join(ART_DIR, "selected_model.joblib"))
    X_train = pd.read_csv(os.path.join(ART_DIR, "X_train.csv"))
    return pre, model, X_train


def _feature_names(pre):
    return list(pre.get_feature_names_out())


def _pretty(name: str) -> str:
    """Turn 'num__systolic_bp' / 'cat__smoking_1' into a friendly label."""
    raw = name.split("__", 1)[1] if "__" in name else name
    return raw.replace("_", " ").title()


def _explainer(model, background):
    """Pick the right SHAP explainer for the model family."""
    name = type(model).__name__
    if name in ("LogisticRegression",):
        return shap.LinearExplainer(model, background, feature_perturbation="interventional")
    if name in ("DecisionTreeClassifier", "RandomForestClassifier", "XGBClassifier"):
        return shap.TreeExplainer(model)
    return shap.Explainer(model, background)


def global_importance(top_k: int = 8, model_name: str = None):
    pre, model, X_train = _load(model_name)
    sample_size = min(300, len(X_train))
    X_sample = X_train.sample(sample_size, random_state=42) if len(X_train) > sample_size else X_train
    X_sample_t = pre.transform(X_sample)
    feats = _feature_names(pre)
    expl = _explainer(model, X_sample_t)
    sv = expl.shap_values(X_sample_t)
    if isinstance(sv, list):          # tree models may return per-class list
        sv = sv[1] if len(sv) > 1 else sv[0]
    sv = np.array(sv)
    if sv.ndim == 3 and sv.shape[-1] == 2:
        sv = sv[:, :, 1]  # positive class for binary classification
    elif sv.ndim > 2:
        sv = sv.squeeze()
    if sv.ndim == 1:
        sv = sv.reshape(1, -1)

    mean_abs = np.abs(sv).mean(axis=0)
    order = [int(idx) for idx in np.argsort(mean_abs)[::-1][:top_k]]
    return [{"feature": _pretty(feats[i]), "raw": feats[i],
             "importance": float(mean_abs[i])} for i in order]


def local_explanation(patient: dict, top_k: int = 8, model_name: str = None):
    """Return top-k signed SHAP contributions for one patient record."""
    pre, model, X_train = _load(model_name)
    try:
        meta = json.load(open(os.path.join(ART_DIR, "metrics.json")))
        feature_order = meta.get("feature_order", FEATURE_ORDER)
        cat_cols = meta.get("cat_cols", CATEGORICAL)
    except Exception:
        feature_order = FEATURE_ORDER
        cat_cols = CATEGORICAL

    row = pd.DataFrame([{k: patient.get(k) for k in feature_order}])
    row_t = pre.transform(row)
    feats = _feature_names(pre)

    background = pre.transform(X_train[:200])  # efficient background for linear/tree
    expl = _explainer(model, background)
    sv = expl.shap_values(row_t)
    if isinstance(sv, list):
        sv = sv[1] if len(sv) > 1 else sv[0]
    sv = np.array(sv).reshape(-1)

    pairs = []
    for i in range(len(feats)):
        raw_feat = feats[i]
        prefix, rest = raw_feat.split("__", 1) if "__" in raw_feat else ("", raw_feat)
        if prefix == "num":
            raw_val = patient.get(rest)
        else:
            # find matching categorical column
            cat_col = next((c for c in cat_cols if rest.startswith(c)), rest)
            raw_val = patient.get(cat_col)
        
        try:
            val_num = float(raw_val) if raw_val is not None and raw_val != "" else None
        except (ValueError, TypeError):
            val_num = None

        pairs.append({
            "feature": _pretty(raw_feat),
            "raw": raw_feat,
            "value": val_num,
            "shap": float(sv[i])
        })

    pairs.sort(key=lambda p: abs(p["shap"]), reverse=True)
    
    base_val = expl.expected_value
    if hasattr(base_val, "__iter__"):
        base_val = float(np.array(base_val).reshape(-1)[-1])
    else:
        base_val = float(base_val)

    return {
        "contributions": pairs[:top_k],
        "base_value": base_val,
        "note": "SHAP describes model behaviour, not causality.",
    }


def global_importance_cached(model_name: str = None):
    if model_name:
        return global_importance(model_name=model_name)
    path = os.path.join(ART_DIR, "shap_global.json")
    if os.path.exists(path):
        try:
            return json.load(open(path))
        except Exception:
            pass
    data = global_importance()
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
    return data
