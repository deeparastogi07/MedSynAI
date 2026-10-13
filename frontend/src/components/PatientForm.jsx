import React from 'react';

const KAGGLE_NUM_FIELDS = [
  ['age', 'Age (years)'],
  ['bmi', 'BMI (kg/m²)'],
  ['systolic_bp', 'Systolic BP (mmHg)'],
  ['diastolic_bp', 'Diastolic BP (mmHg)'],
];

const KAGGLE_CAT_FIELDS = [
  ['gender', 'Gender', [['', '—'], [1, 'Female'], [2, 'Male']]],
  ['cholesterol', 'Cholesterol Level', [['', '—'], [1, '1: Normal (<200 mg/dL)'], [2, '2: Above Normal (200-239)'], [3, '3: High (≥240)']]],
  ['glucose', 'Glucose Level', [['', '—'], [1, '1: Normal (<100 mg/dL)'], [2, '2: Above Normal (100-125)'], [3, '3: High (≥126)']]],
  ['smoking', 'Current Smoker', [['', '—'], [0, 'No'], [1, 'Yes']]],
  ['alcohol', 'Alcohol Intake', [['', '—'], [0, 'No'], [1, 'Yes']]],
  ['active', 'Physical Activity', [['', '—'], [0, 'No (Inactive)'], [1, 'Yes (Active)']]],
];

const SYNTHETIC_NUM_FIELDS = [
  ['age', 'Age (years)'],
  ['bmi', 'BMI'],
  ['systolic_bp', 'Systolic BP (mmHg)'],
  ['glucose', 'Glucose (mg/dL)'],
  ['cholesterol', 'Cholesterol (mg/dL)'],
  ['heart_rate', 'Heart rate (bpm)'],
];

const SYNTHETIC_CAT_FIELDS = [
  ['smoking', 'Smoking', [['', '—'], [0, 'No'], [1, 'Yes']]],
  ['diabetes', 'Diabetes', [['', '—'], [0, 'No'], [1, 'Yes']]],
  ['family_history', 'Family history', [['', '—'], [0, 'No'], [1, 'Yes']]],
  ['exercise_angina', 'Exercise angina', [['', '—'], [0, 'No'], [1, 'Yes']]],
  ['chest_pain_type', 'Chest pain type',
    [['', '—'], [0, 'Typical angina'], [1, 'Atypical angina'],
     [2, 'Non-anginal'], [3, 'Asymptomatic']]],
];

export default function PatientForm({
  value,
  onChange,
  onSubmit,
  onRetrainAndRun,
  onSample,
  onReset,
  busy,
  selectedModel,
  onSelectModel,
  availableModels,
  datasetType = 'kaggle',
  onSelectDataset,
}) {
  const set = (k) => (e) => {
    const raw = e.target.value;
    onChange({ ...value, [k]: raw === '' ? '' : raw });
  };

  const isKaggle = datasetType === 'kaggle';
  const numFields = isKaggle ? KAGGLE_NUM_FIELDS : SYNTHETIC_NUM_FIELDS;
  const catFields = isKaggle ? KAGGLE_CAT_FIELDS : SYNTHETIC_CAT_FIELDS;

  const hasData = Object.values(value).some(v => v !== '' && v !== null && v !== undefined);

  return (
    <div className="panel">
      {/* Dataset & Model Selector Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ margin: 0 }}>
          {isKaggle ? 'Patient record (Kaggle Real Cohort)' : 'Patient record (Synthetic Cohort)'}
        </h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {onSelectDataset && (
            <div className="model-picker" style={{ margin: 0 }}>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>Cohort:</span>
              <select
                value={datasetType}
                onChange={(e) => onSelectDataset(e.target.value)}
                disabled={busy}
                style={{ fontWeight: 600, color: 'var(--accent)' }}
              >
                <option value="kaggle">🏥 Kaggle Real Data (70k)</option>
                <option value="synthetic">🧪 MedSynAI Synthetic (Sec IV-A)</option>
              </select>
            </div>
          )}

          {availableModels && availableModels.length > 0 && (
            <div className="model-picker" style={{ margin: 0 }}>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>Model:</span>
              <select
                value={selectedModel || ''}
                onChange={(e) => onSelectModel(e.target.value)}
                disabled={busy}
              >
                <option value="">Auto (Selected Best)</option>
                {availableModels.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="grid cols-2">
        {numFields.map(([k, label]) => (
          <div className="field" key={k}>
            <label htmlFor={k}>{label}</label>
            <input
              id={k}
              type="number"
              step="any"
              value={value[k] ?? ''}
              onChange={set(k)}
              placeholder="—"
            />
          </div>
        ))}
        {catFields.map(([k, label, opts]) => (
          <div className="field" key={k}>
            <label htmlFor={k}>{label}</label>
            <select id={k} value={value[k] ?? ''} onChange={set(k)}>
              {opts.map(([v, t]) => (
                <option key={t} value={v}>{t}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <button
          className="btn"
          disabled={busy || !hasData}
          onClick={onSubmit}
          title={!hasData ? 'Please enter patient data or click Load sample first' : 'Run MedSynAI evaluation'}
        >
          {busy ? <><span className="spin"/>Analysing…</> : 'Run MedSynAI'}
        </button>
        {onRetrainAndRun && (
          <button
            className="btn secondary"
            disabled={busy || !hasData}
            onClick={onRetrainAndRun}
            title={!hasData ? 'Please enter patient data or click Load sample first' : 'Retrain from scratch and run inference'}
          >
            ⚡ Retrain & Run
          </button>
        )}
        <button className="btn secondary" disabled={busy} onClick={onSample}>
          Load {isKaggle ? 'real Kaggle sample' : 'synthetic sample'}
        </button>
        <button className="btn secondary" disabled={busy} onClick={onReset}>Clear</button>
      </div>

      {!hasData && (
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)', background: 'var(--panel-2)', padding: '6px 10px', borderRadius: 4 }}>
          ℹ️ No sample loaded. Click <strong>"Load {isKaggle ? 'real Kaggle sample' : 'sample'}"</strong> or enter patient vitals above to calculate.
        </div>
      )}

      <p className="footnote">
        {isKaggle
          ? 'Trained on genuine clinical records from the Kaggle Cardiovascular Disease Dataset. Missing values are imputed using train-set medians.'
          : 'Using synthetic structured clinical cohort generator (MedSynAI paper Section IV-A).'}
      </p>
    </div>
  );
}
