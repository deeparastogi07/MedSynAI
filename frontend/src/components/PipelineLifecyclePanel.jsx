import React, { useState } from 'react';

export default function PipelineLifecyclePanel({ lifecycle, isRunning, onRetrainAndRun }) {
  const [tab, setTab] = useState('steps'); // 'steps' | 'training'

  if (!lifecycle && !isRunning) return null;

  return (
    <div className="panel" style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ margin: 0 }}>
          Execution & Training Pipeline Lifecycle
        </h3>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            className={`btn secondary ${tab === 'steps' ? 'active' : ''}`}
            style={{ padding: '4px 10px', fontSize: 11, background: tab === 'steps' ? 'var(--panel-2)' : 'transparent' }}
            onClick={() => setTab('steps')}
          >
            Live Steps ({lifecycle?.execution_steps?.length || 6})
          </button>
          <button
            className={`btn secondary ${tab === 'training' ? 'active' : ''}`}
            style={{ padding: '4px 10px', fontSize: 11, background: tab === 'training' ? 'var(--panel-2)' : 'transparent' }}
            onClick={() => setTab('training')}
          >
            Model Architecture & Training Specs
          </button>
          {onRetrainAndRun && (
            <button
              className="btn"
              style={{ padding: '4px 10px', fontSize: 11 }}
              onClick={onRetrainAndRun}
              disabled={isRunning}
            >
              {isRunning ? <><span className="spin" style={{ width: 8, height: 8 }}/>Training…</> : '⚡ Retrain & Run'}
            </button>
          )}
        </div>
      </div>

      {lifecycle?.was_retrained && (
        <div style={{ marginBottom: 10 }}>
          <span className="badge good">Model freshly retrained from synthetic dataset</span>
        </div>
      )}

      {tab === 'steps' && lifecycle?.execution_steps && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lifecycle.execution_steps.map((s, idx) => (
            <div
              key={s.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '8px 12px',
                borderRadius: 6,
                background: 'var(--panel-2)',
                borderLeft: '3px solid var(--accent)',
              }}
            >
              <div style={{
                fontFamily: 'monospace',
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--accent)',
                marginTop: 2,
                minWidth: 24,
              }}>
                {s.id}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: 13 }}>{s.title}</strong>
                  <span className="badge info" style={{ fontSize: 10 }}>Completed</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text)', marginTop: 2 }}>{s.summary}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{s.detail}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'training' && lifecycle && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="grid cols-3" style={{ gap: 10 }}>
            <div style={{ padding: 10, background: 'var(--panel-2)', borderRadius: 6 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Active Algorithm</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)', marginTop: 2 }}>
                {lifecycle.active_model}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                Class: {lifecycle.algorithm_class}
              </div>
            </div>

            <div style={{ padding: 10, background: 'var(--panel-2)', borderRadius: 6 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Dataset Partitioning</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>
                Train: {lifecycle.dataset.train_records} | Test: {lifecycle.dataset.test_records}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                Total: {lifecycle.dataset.total_records} (Prevalence: {lifecycle.dataset.positive_prevalence})
              </div>
            </div>

            <div style={{ padding: 10, background: 'var(--panel-2)', borderRadius: 6 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Feature Dimension</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>
                {lifecycle.dataset.features_in} Raw → {lifecycle.dataset.features_encoded} Encoded
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                Stratified 80/20 train-test split
              </div>
            </div>
          </div>

          <div className="grid cols-2" style={{ gap: 12 }}>
            <div style={{ padding: 10, background: 'var(--panel-2)', borderRadius: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--muted)' }}>
                Training Hyperparameters
              </div>
              {lifecycle.hyperparameters && Object.keys(lifecycle.hyperparameters).length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontFamily: 'monospace', fontSize: 11 }}>
                  {Object.entries(lifecycle.hyperparameters).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--muted)' }}>{k}:</span>
                      <span style={{ color: 'var(--text)', fontWeight: 600 }}>{String(v)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Default scikit-learn/xgboost configuration</div>
              )}
            </div>

            <div style={{ padding: 10, background: 'var(--panel-2)', borderRadius: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--muted)' }}>
                Test Split Evaluation Metrics
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--muted)' }}>ROC-AUC:</span>
                  <span style={{ fontWeight: 700, color: 'var(--good)' }}>{lifecycle.performance.roc_auc?.toFixed(4)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--muted)' }}>Accuracy:</span>
                  <span>{lifecycle.performance.accuracy?.toFixed(4)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--muted)' }}>F1-Score:</span>
                  <span>{lifecycle.performance.f1?.toFixed(4)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--muted)' }}>Specificity:</span>
                  <span>{lifecycle.performance.specificity?.toFixed(4)}</span>
                </div>
                {lifecycle.performance.confusion && (
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, borderTop: '1px dashed var(--border)', paddingTop: 4 }}>
                    Test Confusion: TN={lifecycle.performance.confusion.tn}, FP={lifecycle.performance.confusion.fp}, FN={lifecycle.performance.confusion.fn}, TP={lifecycle.performance.confusion.tp}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <p className="footnote">
        MedSynAI enforces strict train/test separation: the ColumnTransformer (imputers + one-hot + standard scalers)
        and candidate estimators are fitted only on the 80% train split.
      </p>
    </div>
  );
}
