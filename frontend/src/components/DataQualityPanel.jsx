import React from 'react';

const badgeFor = (s) => s === 'ok' ? 'good' : s === 'incomplete' ? 'warn' : 'bad';

export default function DataQualityPanel({ dq }) {
  if (!dq) return null;
  return (
    <div className="panel">
      <h3>Data-quality status</h3>
      <div style={{ marginBottom: 8 }}>
        <span className={`badge ${badgeFor(dq.status)}`}>{dq.status}</span>
      </div>
      <p style={{ margin: '0 0 10px 0', color: 'var(--muted)' }}>{dq.message}</p>

      <Section title="Missing fields" items={dq.missing} />
      <Section title="Out-of-range fields" items={dq.out_of_range} />
      <Section title="Invalid fields" items={dq.invalid} />

      <p className="footnote">
        Validation runs before prediction. Incomplete records are not silently
        imputed away — the reviewer sees what was missing.
      </p>
    </div>
  );
}

function Section({ title, items }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{title}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
        {items.map(i => (
          <span className="badge bad" key={i}>{i}</span>
        ))}
      </div>
    </div>
  );
}
