import React from 'react';

export default function RulesPanel({ rules }) {
  if (!rules) return null;
  const triggered = rules.filter(r => r.triggered).length;
  return (
    <div className="panel">
      <h3>Prototype clinical rules · separate reasoning channel</h3>
      <div style={{ marginBottom: 8 }}>
        <span className="badge warn">{triggered} of {rules.length} triggered</span>
      </div>
      {rules.map(r => (
        <div className="rule-row" key={r.id}>
          <div className="id">{r.id}</div>
          <div className="desc">
            <b>{r.label}</b>
            <small>{r.message}</small>
          </div>
          <div>
            <span className={`badge ${r.triggered ? 'warn' : 'info'}`}>
              {r.triggered ? 'triggered' : 'not triggered'}
            </span>
          </div>
        </div>
      ))}
      <p className="footnote">
        These rules are a prototype reasoning layer, not validated clinical guidelines.
        They are stored separately from the ML model and never override it.
      </p>
    </div>
  );
}
