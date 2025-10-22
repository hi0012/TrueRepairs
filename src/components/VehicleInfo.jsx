import React, { useState, useEffect } from "react";
import "../styles/VehicleInfo.css";

export default function VehicleInfo({ open, onClose }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userEmail = user?.email || "";

  const [vin, setVin] = useState("");
  const [manual, setManual] = useState({
    nickname: "",
    year: "",
    make: "",
    model: "",
  });
  const [vehicles, setVehicles] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [loadingMakes, setLoadingMakes] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);

  // Fetch vehicles for user
  useEffect(() => {
    if (!open || !userEmail) return;
    (async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/vehicles?email=${encodeURIComponent(userEmail)}`);
        if (res.ok) {
          const data = await res.json();
          setVehicles(data.items || []);
        }
      } catch (e) {
        console.error("Fetch error:", e);
      }
    })();
  }, [open, userEmail]);

  // Fetch Makes when year changes
  useEffect(() => {
    async function fetchMakes() {
      if (!manual.year) return;
      setLoadingMakes(true);
      try {
        const res = await fetch(`http://localhost:5000/api/cardetails/makes?year=${manual.year}`);
        const data = await res.json();
        setMakes(data);
        setModels([]);
        setTrims([]);
        setManual({ ...manual, make: "", model: "", trim: "" });
      } catch (err) {
        console.error("Error loading makes:", err);
      } finally {
        setLoadingMakes(false);
      }
    }
    fetchMakes();
  }, [manual.year]);

  // Fetch Models when make changes
  useEffect(() => {
    async function fetchModels() {
      if (!manual.year || !manual.make) return;
      setLoadingModels(true);
      try {
        const res = await fetch(`http://localhost:5000/api/cardetails/models?year=${manual.year}&make=${manual.make}`);
        const data = await res.json();
        setModels(data);
        setTrims([]);
      } catch (err) {
        console.error("Error loading models:", err);
      } finally {
        setLoadingModels(false);
      }
    }
    fetchModels();
  }, [manual.make]);


  // Fetch Trims + Engine details when model selected
  async function fetchDetails() {
    if (!manual.year || !manual.make || !manual.model) return;
    try {
      const res = await fetch(`http://localhost:5000/api/cardetails/details?year=${manual.year}&make=${manual.make}&model=${manual.model}`);
      const data = await res.json();
      const trimsList = [...new Set(data.map((c) => c.trim))];
      setTrims(trimsList);
      setEngineOptions(data);
    } catch (err) {
      console.error("Error loading details:", err);
    }
  }

  const isValidVIN = /^[A-HJ-NPR-Z0-9]{17}$/i.test(vin);

  // VIN Lookup
  async function handleVinLookup() {
    if (!isValidVIN) {
      setMessage("Please enter a valid 17-character VIN.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/vehicleinfo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vin, email: userEmail }),
      });
      const j = await res.json();

      if (!res.ok) throw new Error(j.message || "VIN lookup failed");

      const basic = j.vehicledb?.data?.basic || {};
      const nickname = `${basic.year || ""} ${basic.make || ""} ${basic.model || ""}`.trim();

      // Save vehicle to DB
      const saveRes = await fetch("http://localhost:5000/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          vin,
          nickname,
          year: basic.year,
          make: basic.make,
          model: basic.model,
          trim: basic.trim,
          data: j.vehicledb?.data || {},
        }),
      });

      const saved = await saveRes.json();
      if (saveRes.ok) {
        setVehicles((prev) => [...prev, saved]);
        setMessage(`Vehicle "${nickname}" added successfully!`);
        setVin("");
      } else {
        setMessage(saved.message || "Failed to save vehicle.");
      }
    } catch (err) {
      console.error(err);
      setMessage("VIN lookup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Manual Add
  async function handleManualAdd() {
    if (!manual.make || !manual.model) {
      setMessage("Please select at least Make and Model.")
      return;
    }

    try {
      const newVehicle = {
        email: userEmail,
        year: manual.year,
        make: manual.make,
        model: manual.model,
      }

      // backend route
      const res = await fetch("http://localhost:5000/api/manual-vehicle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newVehicle),
      })

      const j = await res.json()

      if (res.ok) {
        setVehicles((prev) => [...prev, j.vehicle]);
        setMessage("Vehicle added successfully!");
        setManual({ nickname: "", year: "", make: "", model: "", trim: "" });
      } else {
        setMessage(j.message || "Error saving vehicle.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Failed to connect to server.")
    }
  }

  // Delete Vehicle
  async function handleDelete(v) {
    try {
      await fetch(`http://localhost:5000/api/vehicles/${v._id}`, {method: "DELETE",})
      setVehicles((prev) => prev.filter((veh) => veh._id !== v._id))
      setMessage("Vehicle deleted successfully.")
    } catch (err) {
      console.error(err);
      setMessage("Failed to delete vehicle.")
    }
  }

  function toggleExpand(id) {
    setExpanded(expanded === id ? null : id);
  }

  if (!open) return null;
  const years = Array.from({ length: 36 }, (_, i) => 1990 + i).reverse();

  return (
    <div className="vi-overlay">
      <div className="vi-popup">
        <div className="vi-header">
          <h1>Vehicle Information</h1>
          <p>Add, manage, and view your vehicles</p>
        </div>

        <div className="vi-columns">
          {/* LEFT SIDE */}
          <div className="vi-left">
            <h2>Add Vehicle</h2>

            {/* VIN Lookup */}
            <div className="vi-vin-section">
              <label>VIN Lookup</label>
              <div className="vi-row">
                <input className="vi-input" value={vin} onChange={(e) => setVin(e.target.value.trim().toUpperCase())} placeholder="Enter VIN" maxLength={17} />
                <button className="vi-btn" onClick={handleVinLookup} disabled={loading}>
                  {loading ? "Searching..." : "Search & Save"}
                </button>
              </div>
            </div>

            <div className="vi-divider">
              <span>OR</span>
            </div>

            {/* Manual Add */}
            <div className="vi-manual">
              <label>Year</label>
              <select className="vi-input" alue={manual.year} onChange={(e) =>
                  setManual({
                    year: e.target.value,
                    make: "",
                    model: "",
                    trim: "",
                  })}>
                <option value="">Select Year</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              <label>Make</label>
              <select className="vi-input" value={manual.make} disabled={!manual.year || loadingMakes} onChange={(e) =>
                  setManual({ ...manual, make: e.target.value, model: "", trim: "" })}>
                {loadingMakes ? (
                  <option>Loading makes...</option>) : (<>
                    <option value="">Select Make</option>
                    {makes.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}</>
                )}
              </select>
              <label>Model</label>
              <select className="vi-input" value={manual.model} disabled={!manual.make || loadingModels} onChange={(e) =>
                  setManual({ ...manual, model: e.target.value, trim: "" })
                }
                onBlur={fetchDetails}>
                {loadingModels ? (
                  <option>Loading models...</option>) : (<>
                    <option value="">Select Model</option>
                    {models.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}</>
                )}
              </select>
              <button className="vi-btn" onClick={handleManualAdd}>
                Add Vehicle
              </button>
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="vi-right">
            <h2>My Vehicles</h2>
            {vehicles.length === 0 && <p className="vi-empty">No vehicles added yet.</p>}
            <ul className="vi-list">
              {vehicles.map((v, i) => (
                <li key={v._id || i} className="vi-item">
                  <div className="vi-item-header">
                    <div>
                      <strong>{v.nickname || "Unnamed Vehicle"}</strong>
                      <p>
                        {v.year} {v.make} {v.model} {v.trim}
                      </p>
                    </div>
                    <div className="vi-actions">
                      <button className="vi-view-btn" onClick={() => toggleExpand(v._id || i)}>
                        {expanded === (v._id || i) ? "Hide" : "View"}
                      </button>
                      <button className="vi-delete-btn" onClick={() => handleDelete(v)}>
                        Delete
                      </button>
                    </div>
                  </div>

                  {expanded === (v._id || i) && (
                    <div className="vi-dropdown">
                      <p><strong>Engine:</strong> {v.data?.engine?.engine_size || "—"}</p>
                      <p><strong>Fuel:</strong> {v.data?.fuel?.fuel_type || "—"}</p>
                      <p><strong>Drivetrain:</strong> {v.data?.drivetrain?.drive_type || "—"}</p>
                    </div>)}
                </li>))}
            </ul>
          </div>
        </div>

        {message && <p className="vi-message">{message}</p>}

        <div className="vi-bottom">
          <button className="vi-cancel-btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
