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
    trim: "",
  });
  const [vehicles, setVehicles] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Fetch vehicles
  useEffect(() => {
    if (!open || !userEmail) return;
    (async () => {
      try {
        const r = await fetch(
          `http://localhost:5000/api/vehicles?email=${encodeURIComponent(
            userEmail
          )}`
        );
        if (r.ok) {
          const j = await r.json();
          setVehicles(j.items || []);
        }
      } catch (e) {
        console.error("Fetch error:", e);
      }
    })();
  }, [open, userEmail]);

  const isValidVIN = /^[A-HJ-NPR-Z0-9]{17}$/i.test(vin);

  // VIN lookup
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

      // Auto-generate nickname
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

  // Manual add
  async function handleManualAdd() {
    if (!manual.make || !manual.model) {
      setMessage("Enter at least make and model.");
      return;
    }

    try {
      const newVehicle = { ...manual, email: userEmail };
      const res = await fetch("http://localhost:5000/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newVehicle),
      });
      const j = await res.json();

      if (res.ok) {
        setVehicles((prev) => [...prev, j]);
        setMessage("Vehicle added successfully!");
        setManual({ nickname: "", year: "", make: "", model: "", trim: "" });
      } else {
        setMessage(j.message || "Error saving vehicle.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Failed to connect to server.");
    }
  }

  // Delete vehicle
  async function handleDelete(v) {
    try {
      await fetch(`http://localhost:5000/api/vehicles/${v._id}`, {
        method: "DELETE",
      });
      setVehicles((prev) => prev.filter((veh) => veh._id !== v._id));
      setMessage("Vehicle deleted successfully.");
    } catch (err) {
      console.error(err);
      setMessage("Failed to delete vehicle.");
    }
  }

  function toggleExpand(id) {
    setExpanded(expanded === id ? null : id);
  }

  if (!open) return null;

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

            <div className="vi-vin-section">
              <label>VIN Lookup</label>
              <div className="vi-row">
                <input
                  className="vi-input"
                  value={vin}
                  onChange={(e) =>
                    setVin(e.target.value.trim().toUpperCase())
                  }
                  placeholder="Enter VIN"
                  maxLength={17}
                />
                <button
                  className="vi-btn"
                  onClick={handleVinLookup}
                  disabled={loading}
                >
                  {loading ? "Searching..." : "Search & Save"}
                </button>
              </div>
            </div>

            <div className="vi-divider">
              <span>OR</span>
            </div>

            <div className="vi-manual">
              <label>Nickname</label>
              <input
                className="vi-input"
                placeholder="My Jeep / Weekend Car"
                value={manual.nickname}
                onChange={(e) =>
                  setManual({ ...manual, nickname: e.target.value })
                }
              />

              <label>Year</label>
              <input
                className="vi-input"
                placeholder="2020"
                value={manual.year}
                onChange={(e) =>
                  setManual({ ...manual, year: e.target.value })
                }
              />

              <label>Make</label>
              <input
                className="vi-input"
                placeholder="Jeep"
                value={manual.make}
                onChange={(e) =>
                  setManual({ ...manual, make: e.target.value })
                }
              />

              <label>Model</label>
              <input
                className="vi-input"
                placeholder="Grand Cherokee"
                value={manual.model}
                onChange={(e) =>
                  setManual({ ...manual, model: e.target.value })
                }
              />

              <label>Trim</label>
              <input
                className="vi-input"
                placeholder="Laredo / Altitude"
                value={manual.trim}
                onChange={(e) =>
                  setManual({ ...manual, trim: e.target.value })
                }
              />

              <button className="vi-btn" onClick={handleManualAdd}>
                Add Vehicle
              </button>
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="vi-right">
            <h2>My Vehicles</h2>
            {vehicles.length === 0 && (
              <p className="vi-empty">No vehicles added yet.</p>
            )}
            <ul className="vi-list">
              {vehicles.map((v, i) => (
                <li key={v._id || i} className="vi-item">
                  <div className="vi-item-header">
                    <div>
                      <strong>{v.nickname || "Unnamed Vehicle"}</strong>
                      <p>
                        {v.year || ""} {v.make || ""} {v.model || ""}{" "}
                        {v.trim || ""}
                      </p>
                    </div>
                    <div className="vi-actions">
                      <button
                        className="vi-view-btn"
                        onClick={() => toggleExpand(v._id || i)}
                      >
                        {expanded === (v._id || i) ? "Hide" : "View"}
                      </button>
                      <button
                        className="vi-delete-btn"
                        onClick={() => handleDelete(v)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {expanded === (v._id || i) && (
                    <div className="vi-dropdown">
                      <p><strong>Trim:</strong> {v.trim || "—"}</p>
                      <p><strong>Drivetrain:</strong> {v.data?.drivetrain?.drive_type || "—"}</p>
                      <p><strong>Fuel:</strong> {v.data?.fuel?.fuel_type || "—"}</p>
                      <p><strong>Engine:</strong> {v.data?.engine?.engine_size || "—"}</p>
                      <p><strong>Configuration:</strong> {v.data?.engine?.engine_configuration || "—"}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {message && <p className="vi-message">{message}</p>}

        <div className="vi-bottom">
          <button className="vi-cancel-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
