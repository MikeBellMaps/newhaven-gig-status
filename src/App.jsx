import React, { useEffect, useMemo, useState } from "react";
import { computeStatus } from "./logic.js";

const STORAGE_KEY = "newhavenGigStatus:v1";

const DEFAULTS = {
  date: new Date().toISOString().slice(0, 10),
  startTime: "17:00",
  endTime: "19:00",
  windMph: 12,
  gustMph: "",
  windDir: "SW",
  waveHeightM: 0.7,
  wavePeriodS: 4,
  tideState: "EBB", // EBB | FLOOD | SLACK
  tideStrength: "MID", // NEAP | MID | SPRING
  crewProfile: "COMPETENT", // MIXED | COMPETENT | EXPERT
  night: false,
  poorVisibility: false
};

function badgeClass(color) {
  if (color === "GREEN") return "badge badge-green";
  if (color === "AMBER") return "badge badge-amber";
  return "badge badge-red";
}

export default function App() {
  const [form, setForm] = useState(DEFAULTS);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setForm({ ...DEFAULTS, ...parsed });
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch {
      // ignore
    }
  }, [form]);

  const result = useMemo(() => computeStatus(form), [form]);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(result.summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // fallback: do nothing
    }
  }

  return (
    <div className="wrap">
      <header className="header">
        <div>
          <h1>Newhaven Gig Status</h1>
          <p className="sub">Windfinder inputs to Green / Amber / Red for 30 ft Cornish gigs</p>
        </div>
        <div className={badgeClass(result.finalColor)} aria-label="Final status">
          {result.finalColor}
        </div>
      </header>

      <main className="grid">
        <section className="card">
          <h2>Session</h2>
          <div className="row">
            <label>
              Date
              <input
                type="date"
                value={form.date}
                onChange={(e) => update("date", e.target.value)}
              />
            </label>
            <label>
              Start
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => update("startTime", e.target.value)}
              />
            </label>
            <label>
              End
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => update("endTime", e.target.value)}
              />
            </label>
          </div>

          <div className="row">
            <label>
              Crew profile
              <select
                value={form.crewProfile}
                onChange={(e) => update("crewProfile", e.target.value)}
              >
                <option value="MIXED">Mixed</option>
                <option value="COMPETENT">Competent</option>
                <option value="EXPERT">Expert</option>
              </select>
            </label>

            <label className="check">
              <input
                type="checkbox"
                checked={form.night}
                onChange={(e) => update("night", e.target.checked)}
              />
              Night
            </label>

            <label className="check">
              <input
                type="checkbox"
                checked={form.poorVisibility}
                onChange={(e) => update("poorVisibility", e.target.checked)}
              />
              Poor visibility
            </label>
          </div>
        </section>

        <section className="card">
          <h2>Wind and waves (Windfinder)</h2>
          <div className="row">
            <label>
              Wind (mph)
              <input
                type="number"
                min="0"
                step="1"
                value={form.windMph}
                onChange={(e) => update("windMph", Number(e.target.value))}
              />
            </label>

            <label>
              Gust (mph) optional
              <input
                type="number"
                min="0"
                step="1"
                value={form.gustMph}
                onChange={(e) => update("gustMph", e.target.value)}
                placeholder="optional"
              />
            </label>

            <label>
              Wind direction
              <select value={form.windDir} onChange={(e) => update("windDir", e.target.value)}>
                {["N", "NE", "E", "SE", "S", "SW", "W", "NW"].map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="row">
            <label>
              Wave height (m)
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.waveHeightM}
                onChange={(e) => update("waveHeightM", Number(e.target.value))}
              />
            </label>

            <label>
              Wave period (s)
              <input
                type="number"
                min="1"
                step="1"
                value={form.wavePeriodS}
                onChange={(e) => update("wavePeriodS", Number(e.target.value))}
              />
            </label>

            <div className="stat">
              <div className="stat-label">Wave distance</div>
              <div className="stat-value">{result.waveDistanceM ?? "?"} m</div>
              <div className="stat-hint">1.56 × period²</div>
            </div>
          </div>
        </section>

        <section className="card">
          <h2>Tide</h2>
          <div className="row">
            <label>
              Tide state
              <select value={form.tideState} onChange={(e) => update("tideState", e.target.value)}>
                <option value="FLOOD">Flood</option>
                <option value="EBB">Ebb</option>
                <option value="SLACK">Slack</option>
              </select>
            </label>

            <label>
              Tide strength
              <select
                value={form.tideStrength}
                onChange={(e) => update("tideStrength", e.target.value)}
              >
                <option value="NEAP">Neap</option>
                <option value="MID">Mid</option>
                <option value="SPRING">Spring</option>
              </select>
            </label>
          </div>

          <div className="note">
            Local rule used in this MVP: flood assumed east-going, ebb assumed west-going, for wind-against-tide
            checks. You can refine this later with a local tide API.
          </div>
        </section>

        <section className="card">
          <h2>Result</h2>

          <div className="result">
            <div className="result-line">
              <span className="k">Base:</span> <span className={badgeClass(result.baseColor)}>{result.baseColor}</span>
              <span className="sep"></span>
              <span className="k">Final:</span>{" "}
              <span className={badgeClass(result.finalColor)}>{result.finalColor}</span>
            </div>

            <ul className="bullets">
              {result.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>

            {result.escalators.length > 0 && (
              <>
                <h3>Escalators applied</h3>
                <ul className="bullets">
                  {result.escalators.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </>
            )}

            {result.controls.length > 0 && (
              <>
                <h3>Controls</h3>
                <ul className="bullets">
                  {result.controls.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </>
            )}

            <div className="actions">
              <button className="btn" onClick={copySummary}>
                {copied ? "Copied" : "Copy share text"}
              </button>
            </div>

            <textarea className="share" readOnly value={result.summary} />
          </div>
        </section>
      </main>

      <footer className="footer">
        <small>Version 1. Local storage only. No external data pulls.</small>
      </footer>
    </div>
  );
}
