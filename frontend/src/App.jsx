import React, { useEffect, useState } from 'react';
import { api } from './api';
import PatientForm from './components/PatientForm';
import PredictionPanel from './components/PredictionPanel';
import ShapPanel from './components/ShapPanel';
import RulesPanel from './components/RulesPanel';
import DataQualityPanel from './components/DataQualityPanel';
import ReviewBanner from './components/ReviewBanner';
import ModelComparison from './components/ModelComparison';
import TrainingPanel from './components/TrainingPanel';
import PipelineLifecyclePanel from './components/PipelineLifecyclePanel';
import LiveCalculationProgress from './components/LiveCalculationProgress';

const EMPTY = {
  age: '', bmi: '', systolic_bp: '', glucose: '', cholesterol: '', heart_rate: '',
  smoking: '', diabetes: '', family_history: '', chest_pain_type: '', exercise_angina: '',
};

const TABS = ['Review', 'Model comparison', 'Explainability'];

export default function App() {
  const [tab, setTab]                 = useState('Review');
  const [patient, setPatient]         = useState(EMPTY);
  const [result, setResult]           = useState(null);
  const [busy, setBusy]               = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [err, setErr]                 = useState(null);
  const [health, setHealth]           = useState(null);
  const [selectedModel, setSelectedModel] = useState('');
  const [availableModels, setAvailableModels] = useState([]);
  const [datasetType, setDatasetType] = useState('kaggle');
  const [datasetName, setDatasetName] = useState('Kaggle Cardiovascular Disease Dataset (Real Clinical Cohort)');

  const pendingResultRef = React.useRef(null);
  const animDoneRef = React.useRef(false);

  useEffect(() => {
    api.health()
      .then(() => setHealth(true))
      .catch(() => setHealth(false));

    api.datasetInfo()
      .then((info) => {
        if (info.dataset_type) setDatasetType(info.dataset_type);
        if (info.dataset_name) setDatasetName(info.dataset_name);
      })
      .catch(() => {});

    api.models()
      .then((m) => {
        setAvailableModels(m.available_models || []);
      })
      .catch(() => {});
  }, []);

  const handleSelectDataset = async (newType) => {
    setBusy(true);
    setResult(null);
    setPatient(EMPTY);
    setErr(null);
    try {
      const res = await api.train(newType);
      setDatasetType(newType);
      setDatasetName(res.dataset_name || (newType === 'kaggle' ? 'Kaggle Real Data' : 'Synthetic Data'));
      const m = await api.models();
      setAvailableModels(m.available_models || []);
    } catch (e) {
      setErr(`Failed to switch dataset: ${e}`);
    } finally {
      setBusy(false);
    }
  };

  const normalise = (p) => {
    const out = {};
    for (const k of Object.keys(p)) {
      const v = p[k];
      out[k] = (v === '' || v === null || v === undefined) ? null : Number(v);
    }
    return out;
  };

  const checkFinish = () => {
    if (pendingResultRef.current && animDoneRef.current) {
      setResult(pendingResultRef.current);
      setCalculating(false);
      setBusy(false);
      pendingResultRef.current = null;
      animDoneRef.current = false;
    }
  };

  const onAnimComplete = () => {
    animDoneRef.current = true;
    checkFinish();
  };

  const hasData = Object.values(patient).some(v => v !== '' && v !== null && v !== undefined);

  const submit = async (shouldRetrain = false) => {
    if (!hasData) {
      setResult(null);
      setCalculating(false);
      setBusy(false);
      setErr("Please load a sample or enter patient data before running.");
      return;
    }

    setBusy(true);
    setErr(null);
    setCalculating(true);
    pendingResultRef.current = null;
    animDoneRef.current = false;

    try {
      const r = await api.predict(normalise(patient), selectedModel || undefined, shouldRetrain);
      pendingResultRef.current = r;
      checkFinish();
    } catch (e) {
      setErr(String(e));
      setCalculating(false);
      setBusy(false);
    }
  };

  const retrainAndSubmit = () => submit(true);

  const loadSample = async () => {
    try {
      const s = await api.samplePatient(datasetType);
      setPatient(s);
      setResult(null);
      setErr(null);
    } catch (e) { setErr(String(e)); }
  };

  return (
    <div className="container">
      <header>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1>MedSynAI</h1>
            <p>
              Explainable AI Clinical Decision Support on <strong>{datasetName}</strong>.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="badge info">
              {datasetType === 'kaggle' ? '🏥 Kaggle Real Cohort (70k Patients)' : '🧪 MedSynAI Synthetic Benchmark'}
            </span>
            <span className={`badge ${health === true ? 'good' : health === false ? 'bad' : 'warn'}`}>
              Backend: {health === true ? 'Connected' : health === false ? 'Disconnected' : 'Checking…'}
            </span>
          </div>
        </div>
      </header>

      {health === false && (
        <div className="review-banner required" style={{ marginTop: 14 }}>
          <div>Backend not reachable on http://localhost:8000 — start the FastAPI service.</div>
        </div>
      )}

      <nav className="tabs">
        {TABS.map(t => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </nav>

      {tab === 'Review' && (
        <>
          {(calculating || (hasData && result)) && (
            <LiveCalculationProgress
              activeModel={selectedModel}
              isRunning={calculating}
              onComplete={onAnimComplete}
            />
          )}

          {hasData && !calculating && result && <ReviewBanner coordination={result.coordination} />}

          <div className={hasData && !calculating && result ? "grid cols-2" : ""}>
            <PatientForm
              value={patient}
              onChange={(p) => {
                setPatient(p);
                const stillHasData = Object.values(p).some(v => v !== '' && v !== null && v !== undefined);
                if (!stillHasData) {
                  setResult(null);
                  setErr(null);
                }
              }}
              onSubmit={() => submit(false)}
              onRetrainAndRun={retrainAndSubmit}
              onSample={loadSample}
              onReset={() => { setPatient(EMPTY); setResult(null); setErr(null); setCalculating(false); }}
              busy={busy}
              selectedModel={selectedModel}
              onSelectModel={setSelectedModel}
              availableModels={availableModels}
              datasetType={datasetType}
              onSelectDataset={handleSelectDataset}
            />
            {hasData && !calculating && result && (
              <div className="results-container" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <PredictionPanel result={result} />
                <DataQualityPanel dq={result?.data_quality} />
              </div>
            )}
          </div>

          {hasData && !calculating && result && (
            <div className="results-container">
              <div className="grid cols-2" style={{ marginTop: 16 }}>
                <ShapPanel shap={result.shap_local} />
                <RulesPanel rules={result.rules} />
              </div>
              <PipelineLifecyclePanel
                lifecycle={result.pipeline_lifecycle}
                isRunning={busy}
                onRetrainAndRun={retrainAndSubmit}
              />
            </div>
          )}

          {err && <div className="panel" style={{ marginTop: 16, color: 'var(--bad)' }}>{err}</div>}
        </>
      )}

      {tab === 'Model comparison' && (
        <ModelComparison
          activeModel={selectedModel}
          onSelectModel={(m) => {
            setSelectedModel(m);
            setTab('Review');
          }}
        />
      )}

      {tab === 'Explainability' && (
        <TrainingPanel availableModels={availableModels} />
      )}
    </div>
  );
}
