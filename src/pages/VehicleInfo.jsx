import { useEffect, useMemo, useState } from "react";
import "./VehicleInfo.css";

export default function VehicleInfo() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userEmail = user?.email || "";
  const [vin, setVin] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [showJson, setShowJson] = useState(false);
  const [history, setHistory] = useState([]);

  const isValidVIN = useMemo(() => /^[A-HJ-NPR-Z0-9]{17}$/i.test(vin), [vin]);

  useEffect(() => {
    if (!userEmail) return;
    (async () => {
      try {
        const r = await fetch(`/api/history?email=${encodeURIComponent(userEmail)}`);
        if (!r.ok) return;
        const j = await r.json();
        setHistory(j.items || []);
      } catch {}
    })();
  }, [userEmail]);

  async function lookup(save = true) {
    setErr("");
    setData(null);
    if (!isValidVIN) {
      setErr("Please enter a valid 17-character VIN (I, O, Q not allowed).");
      return;
    }
    if (!userEmail) {
      setErr("You must be logged in to save lookup history.");
      return;
    }
    setLoading(true);
    try {
      const r = await fetch(`/api/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, vin })
      });
      if (!r.ok) throw new Error(`Request failed (${r.status})`);
      const j = await r.json();
      setData(j);
      setShowJson(false);
      // refresh history list
      try {
        const h = await fetch(`/api/history?email=${encodeURIComponent(userEmail)}`);
        const hj = await h.json();
        setHistory(hj.items || []);
      } catch {}
    } catch (e) {
      setErr("Lookup failed. Please check the VIN or try again.");
    } finally {
      setLoading(false);
    }
  }

  function copyVIN() {
    if (!vin) return;
    navigator.clipboard?.writeText(vin);
  }

  function selectFromHistory(item) {
    setVin(item.vin || "");
    setData(item.data || null);
    setErr("");
    setShowJson(false);
  }

  const v = data?.vehicledb?.data || {};
  const intro = v.intro || {};
  const basic = v.basic || {};
  const engine = v.engine || {};
  const drivetrain = v.drivetrain || {};
  const dimensions = v.dimensions || {};
  const fuel = v.fuel || {};

  return (
    <div className="vi-wrap">
      <h2 className="vi-title">Vehicle Info</h2>

      <div className="vi-top">
        <div className="vi-search">
          <input
            value={vin}
            onChange={(e) => setVin(e.target.value.trim().toUpperCase())}
            placeholder="Enter 17-character VIN"
            className="vi-input"
            maxLength={17}
          />
          <button className="vi-btn" onClick={() => lookup(true)} disabled={loading || vin.length < 5}>
            {loading ? "Searching…" : "Search & Save"}
          </button>
        </div>

        <aside className="vi-history">
          <div className="vi-card">
            <header className="vi-card-h">Recent Lookups</header>
            {history.length === 0 && <div className="vi-empty">No history yet.</div>}
            <ul className="vi-list">
              {history.map((h) => (
                <li key={h._id}>
                  <button className="vi-link" onClick={() => selectFromHistory(h)}>
                    {h.vin}
                  </button>
                  <span className="vi-muted">
                    {new Date(h.createdAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      {!isValidVIN && vin.length > 0 && (
        <div className="vi-hint">VIN must be 17 characters (A–Z, 0–9), no I / O / Q.</div>
      )}
      {err && <div className="vi-error">{err}</div>}

      {data && (
        <div className="vi-grid">
          <section className="vi-card">
            <header className="vi-card-h">Basics</header>
            <KV label="VIN" value={intro.vin} />
            <KV label="Make" value={basic.make} />
            <KV label="Model" value={basic.model} />
            <KV label="Year" value={basic.year} />
            <KV label="Trim" value={basic.trim} />
            <KV label="Body" value={basic.body_type} />
            <KV label="Vehicle Type" value={v.vehicle_type} />
            <KV label="Doors" value={v.doors} />
          </section>

          <section className="vi-card">
            <header className="vi-card-h">Engine & Drivetrain</header>
            <KV label="Cylinders" value={engine.cylinders} />
            <KV label="Size" value={engine.engine_size} />
            <KV label="Configuration" value={engine.engine_configuration || "—"} />
            <KV label="Drive" value={drivetrain.drive_type} />
            <KV label="Fuel" value={fuel.fuel_type} />
            <KV label="Secondary Fuel" value={fuel.secondary_fuel_type} />
            <KV label="GVWR" value={dimensions.gvwr} />
          </section>

          <section className="vi-card vi-card--full">
            <header className="vi-card-h vi-row">
              <span>Actions</span>
              <div className="vi-row">
                <button className="vi-btn vi-btn--ghost" onClick={copyVIN} disabled={!intro.vin}>
                  Copy VIN
                </button>
                <button className="vi-btn vi-btn--ghost" onClick={() => setShowJson(s => !s)}>
                  {showJson ? "Hide Raw JSON" : "Show Raw JSON"}
                </button>
              </div>
            </header>

            {showJson && (
              <pre className="vi-json">{JSON.stringify(data, null, 2)}</pre>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function KV({ label, value }) {
  return (
    <div className="vi-kv">
      <div className="vi-k">{label}</div>
      <div className="vi-v">{value ?? "—"}</div>
    </div>
  );
}
