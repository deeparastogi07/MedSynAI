# MedSynAI: Complete Implementation

- **Datasets Supported**:
  - **Kaggle Cardiovascular Disease Dataset** (70,000 real patient clinical examination records)
  - **MedSynAI Synthetic Clinical Cohort** (Paper Section IV-A benchmark, seed=42)
- **Statistical & ML Models**: Logistic Regression, Decision Tree, Random Forest, and **XGBoost**.
- **Explainability (XAI)**: Local (patient-level signed contributions) and Global feature importance powered by **SHAP**.
- **Data Quality Layer**: Input validation, missingness detection, and range boundaries before prediction.
- **Explicit Clinical Rules**: Prototype rule layer (8 distinct rules) inspectable separately from the ML model.
- **Coordination Layer & Review Dashboard**: Escalation triggers, model vs. rule disagreement flags, and evidence provenance tracking.

---

## Architecture Overview

MedSynAI separates decision support into distinct, non-overlapping layers to avoid false claims of autonomy and ensure inspectability:

1. **Input Validation Subsystem (`backend/coordination.py`)**  
   Audits incoming patient records for missing fields, values outside physiological bounds, and illegal categorical inputs.
2. **Preprocessing Pipeline (`backend/preprocessing.py`)**  
   Fitted exclusively on training data with median imputation + standardization for numerics, and most-frequent imputation + one-hot encoding for categoricals.
3. **Prediction Models (`backend/models.py`)**  
   Trains and evaluates 4 candidates (Logistic Regression, Decision Tree, Random Forest, XGBoost) on either the real Kaggle cohort (70,000 records) or the synthetic benchmark. Compares metrics and selects the best candidate while keeping all models accessible.
4. **SHAP Explainability (`backend/explainability.py`)**  
   Computes local signed feature attributions and training-set global mean absolute SHAP values using `LinearExplainer` and `TreeExplainer`.
5. **Clinical Rules Engine (`backend/rules_engine.py`)**  
   Explicit prototype clinical reasoning checks kept separate from statistical weights.
6. **Review Coordination (`backend/coordination.py`)**  
   Assembles the evidence dashboard: checks for model/rule disagreement, data quality issues, or positive predictions requiring clinician review.

---

## Directory Structure

```text
medsynai/
├── backend/
│   ├── app.py                 # FastAPI REST server & routing
│   ├── kaggle_dataset.py      # Real Kaggle Cardiovascular Disease Dataset loader (70,000 records)
│   ├── data_generator.py      # Synthetic structured-clinical dataset generator (seed=42)
│   ├── preprocessing.py       # Scikit-learn Pipeline & ColumnTransformer
│   ├── models.py              # Training, evaluation & persistence (XGBoost, LR, DT, RF)
│   ├── explainability.py      # SHAP local & global attribution computation
│   ├── rules_engine.py        # Prototype rule checks (R-01 through R-08)
│   ├── coordination.py        # Data quality checks & escalation logic
│   ├── requirements.txt       # Python package dependencies
│   ├── data/
│   │   └── cardio_train.csv   # Kaggle Cardiovascular Disease Dataset
│   └── artifacts/             # Saved models, preprocessor, metrics, and CSV splits
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── styles.css
│       ├── api.js
│       └── components/
│           ├── PatientForm.jsx        # Patient input + one-click sample loader
│           ├── PredictionPanel.jsx    # Model output, probability & class
│           ├── ShapPanel.jsx          # Patient-level signed SHAP bars
│           ├── RulesPanel.jsx         # Prototype clinical rules status
│           ├── DataQualityPanel.jsx   # Input validation & missingness report
│           ├── ReviewBanner.jsx       # Escalation banner & evidence provenance table
│           ├── ModelComparison.jsx    # 4-model comparison table (ROC-AUC, F1, etc.)
│           └── TrainingPanel.jsx      # Global SHAP feature importance & retrain
├── run_backend.bat            # One-click Windows launch for backend
├── run_frontend.bat           # One-click Windows launch for frontend
└── README.md
```

---

## Quickstart Guide

### 1. Backend

Navigate to `backend/`, activate the virtual environment, and launch FastAPI:

```bash
cd backend
.venv\Scripts\activate       # On Linux/macOS: source .venv/bin/activate
python -m uvicorn app:app --reload --port 8000
```

> **Note:** Models and preprocessing artifacts are automatically trained and cached on startup if not already present.

API Documentation is available at: [http://localhost:8000/docs](http://localhost:8000/docs)

### 2. Frontend

Navigate to `frontend/` and run the Vite development server:

```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## How to Transfer & Run on Another Computer

Follow this guide to move MedSynAI to any other computer (Windows, macOS, or Linux).

### Step 1: Prepare the Files to Transfer
> [!IMPORTANT]
> **DO NOT** copy the `.venv` or `node_modules` folders. They contain machine-specific binary files and absolute paths that will break on a different computer.

1. **Delete or exclude** these two heavy folders before copying:
   - `backend/.venv`
   - `frontend/node_modules`
2. **Copy or ZIP** the entire `medsynai` folder. (Without `.venv` and `node_modules`, the whole project is only ~12 MB!).
3. Transfer the folder or zip file to the new computer (via USB drive, Google Drive, or Git).

---

### Step 2: Install Prerequisites on the New Computer
Make sure the new computer has the following two tools installed:

1. **Python (version 3.10, 3.11, or 3.12)**:
   - Download from [python.org/downloads](https://www.python.org/downloads/)
   - ⚠️ **Windows users:** On the very first installer screen, you **MUST check the box**: `"Add python.exe to PATH"` before clicking *Install Now*.
2. **Node.js (v18 or v20+ LTS)**:
   - Download from [nodejs.org](https://nodejs.org/) and run the installer with default settings.

---

### Step 3: Start the Application

#### Option A: Windows (One-Click Launch)
1. Double-click `run_backend.bat`
   - It will automatically create a new virtual environment `.venv`, install all Python dependencies from `requirements.txt`, and start the FastAPI server on port 8000.
2. Double-click `run_frontend.bat`
   - It will automatically run `npm install` and launch the Vite development server on port 5173.
3. Open your browser at **http://localhost:5173**.

#### Option B: macOS / Linux
Open two terminal windows in the `medsynai` root directory:
- **Terminal 1 (Backend):**
  ```bash
  chmod +x run_backend.sh
  ./run_backend.sh
  ```
- **Terminal 2 (Frontend):**
  ```bash
  chmod +x run_frontend.sh
  ./run_frontend.sh
  ```
- Open your browser at **http://localhost:5173**.

#### Option C: Manual Terminal Commands (Any OS)
If you prefer running commands manually:

1. **Start Backend:**
   ```bash
   cd backend
   # Windows:
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   python -m uvicorn app:app --reload --port 8000

   # macOS / Linux:
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   python -m uvicorn app:app --reload --port 8000
   ```
2. **Start Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---

### Step 4: Verification
- **Frontend UI:** [http://localhost:5173](http://localhost:5173)
- **Interactive Backend API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check:** [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

### Troubleshooting
- **"Python is not recognized as an internal or external command"**: Python was not added to your system PATH. Re-run the Python installer, select **Modify**, and check **Add Python to environment variables**.
- **PowerShell Script Execution Policy Error (`activate.ps1 cannot be loaded`)**: Use the standard Windows Command Prompt (`cmd.exe`) or double-click `run_backend.bat`. Alternatively, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` in PowerShell.
- **Port 8000 or 5173 already in use**: Close any existing Python/Node processes or specify a different port (e.g. `--port 8001`).

---

## API Endpoints

- `GET /api/health` — Service health check.
- `POST /api/train` — Retrains all 4 models on synthetic dataset and persists artifacts.
- `GET /api/models` — Lists available models and current best selected model.
- `GET /api/model-comparison` — Retrieves accuracy, precision, recall, F1, specificity, ROC-AUC and confusion matrices.
- `GET /api/shap/global` — Returns mean absolute SHAP values across training features.
- `GET /api/rules` — Metadata on all prototype clinical rules.
- `GET /api/sample-patient` — Returns a random synthetic patient for instant test inference.
- `POST /api/predict?model={model_name}` — Runs the full CDSS pipeline for a patient record.
