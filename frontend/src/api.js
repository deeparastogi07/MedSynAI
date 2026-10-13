const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

async function call(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}${errorText ? ': ' + errorText : ''}`);
  }
  return res.json();
}

export const api = {
  health:            ()                  => call('/api/health'),
  datasetInfo:       ()                  => call('/api/dataset-info'),
  train:             (dataset)           => call(`/api/train${dataset ? '?dataset=' + encodeURIComponent(dataset) : ''}`, { method: 'POST' }),
  modelComparison:   ()                  => call('/api/model-comparison'),
  models:            ()                  => call('/api/models'),
  shapGlobal:        (model)             => call(`/api/shap/global${model ? `?model=${encodeURIComponent(model)}` : ''}`),
  listRules:         ()                  => call('/api/rules'),
  samplePatient:     (dataset)           => call(`/api/sample-patient${dataset ? '?dataset=' + encodeURIComponent(dataset) : ''}`),
  predict:           (patient, model, retrain = false)    => {
    const params = new URLSearchParams();
    if (model) params.append('model', model);
    if (retrain) params.append('retrain', 'true');
    const qs = params.toString() ? `?${params.toString()}` : '';
    return call(`/api/predict${qs}`, {
      method: 'POST',
      body: JSON.stringify(patient),
    });
  },
};
