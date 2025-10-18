import React, { useState, useEffect } from "react";
import "../styles/Reports.css";
import parts from "../data/parts.json";

export default function Reports({ open, onClose }) {
  if (!open) return null;

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userEmail = user?.email || "";

  const [vehicles, setVehicles] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedPart, setSelectedPart] = useState("");
  const [message, setMessage] = useState("");

  const categories = Object.keys(parts);

  useEffect(() => {
    if (!userEmail) return;
    (async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/api/vehicles?email=${encodeURIComponent(userEmail)}`
        );
        if (res.ok) {
          const data = await res.json();
          setVehicles(data.items || []);
        }
      } catch (e) {
        console.error("Fetch error:", e);
      }
    })();
  }, [userEmail]);

  function toggleExpand(id) {
    setExpanded(expanded === id ? null : id);
  }

  function handleSelect(v) {
    try {
      // Get engine from nested
      const engineValue =
        v.data?.engine?.engine_size ||
        v.data?.engine_size ||
        v.engine ||
        "Unknown";

      // Format it nicely
      const formattedEngine = engineValue.includes("L")
        ? engineValue
        : engineValue !== "Unknown"
        ? `${engineValue}L V6`
        : "Unknown";

      // Set selected vehicle
      const selected = {
        ...v,
        engine: formattedEngine.trim(),
      };

      console.log("Selected vehicle data:", selected);
      setSelectedVehicle(selected);
      setMessage(`Selected ${selected.year} ${selected.make} ${selected.model}`);
    } catch (err) {
      console.error("Error selecting vehicle:", err);
      setMessage("Error selecting vehicle.");
    }
  }




  async function handleDelete(v) {
    try {
      await fetch(`http://localhost:5000/api/vehicles/${v._id}`, {
        method: "DELETE",
      });
      setVehicles((prev) => prev.filter((veh) => veh._id !== v._id));
      setMessage("Vehicle deleted successfully.");
      if (selectedVehicle?._id === v._id) setSelectedVehicle(null);
    } catch (err) {
      console.error(err);
      setMessage("Failed to delete vehicle.");
    }
  }

  async function handleGenerate() {
    if (!selectedVehicle || !selectedPart || !selectedCategory) return;

    const payload = {
      make: selectedVehicle.make?.toUpperCase() || "",
      year: selectedVehicle.year || "",
      model: selectedVehicle.model?.toUpperCase() || "",
      engine: selectedVehicle.engine?.toUpperCase() || "",
      category: selectedCategory.toUpperCase(),
      subcategory: selectedPart.toUpperCase(),
    };

    console.log("Payload being sent to backend:", payload);
    setMessage(`Scraping RockAuto for ${payload.year} ${payload.make} ${payload.model}...`);

    try {
      const res = await fetch("http://localhost:5000/api/scrape-rockauto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log("Raw response status:", res.status);

      const text = await res.text();
      console.log("Raw backend response text:", text);

      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        console.error("JSON parse error:", err);
        console.log("Response wasn't valid JSON — here's what was returned:", text);
        setMessage("Backend did not return valid JSON.");
        return;
      }

      console.log("Parsed backend response:", data);

      if (data.success) {
        console.log("Parts data:", data.parts);
        setMessage(`Found ${data.parts.length} parts for ${payload.category} → ${payload.subcategory}`);
      } else {
        console.warn("Backend scrape failed:", data);
        setMessage("Scrape failed. Check console for details.");
      }
    } catch (err) {
      console.error("Network or fetch error:", err);
      setMessage("Error connecting to scraper. Check console logs.");
    }
  }




  return (
    <div className="reportoverlay" onClick={onClose}>
      <div className="reportpopup" onClick={(e) => e.stopPropagation()}>
        <div className="reportheader">
          <h1>Vehicle Reports</h1>
          <p>Add, manage, view, and download your reports</p>
        </div>
        <div className="reportcolumns">
          <div className="reportleft">
            <div className="reportbox reportvehiclesbox">
              <h2>Vehicles</h2>
              {vehicles.length === 0 ? (
                <p className="reportempty">No vehicles added yet.</p>) : (
                <ul className="reportlist">
                  {vehicles.map((v, i) => (
                    <li key={v._id || i} className="reportitem">
                      <div className="reportitemheader">
                        <div>
                          <strong>{v.nickname || "Unnamed Vehicle"}</strong>
                          <p>{v.year} {v.make} {v.model}</p>
                        </div>
                        <div className="reportactions">
                          <button
                            className="reportviewbtn"
                            onClick={() => toggleExpand(v._id || i)}
                          >
                            {expanded === (v._id || i) ? "Hide" : "View"}
                          </button>
                          <button
                            className="reportviewbtn"
                            onClick={() => handleSelect(v)}
                          >
                            Select
                          </button>
                        </div>
                      </div>

                      {expanded === (v._id || i) && (
                        <div className="reportdropdown">
                          <p><strong>Engine:</strong> {v.data?.engine?.engine_size || "—"}</p>
                          <p><strong>Fuel:</strong> {v.data?.fuel?.fuel_type || "—"}</p>
                          <p><strong>Drivetrain:</strong> {v.data?.drivetrain?.drive_type || "—"}</p>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="reportbox reportgeneratebox">
              <h2>Generate Report</h2>

              <div className="reportselectors">
              <div className="reportselected">
                {selectedVehicle ? (
                  <>
                    <p>Year: {selectedVehicle.year}</p>
                    <p>Make: {selectedVehicle.make}</p>
                    <p>Model: {selectedVehicle.model}</p>
                    <p>Engine: {selectedVehicle.engine}</p>
                  </>
                ) : (
                  <p className="reportplaceholder">Select a car from above</p>
                )}
              </div>


                <div className="reportselectfield">
                  <label>Area of Car:</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setSelectedPart("");
                    }}
                  >
                    <option value="">Select Area</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedCategory && (
                  <div className="reportselectfield">
                    <label>Part:</label>
                    <select
                      value={selectedPart}
                      onChange={(e) => setSelectedPart(e.target.value)}
                    >
                      <option value="">Select Part</option>
                      {(parts[selectedCategory] || []).map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <button
                className="reportgeneratebtn"
                disabled={!selectedVehicle || !selectedPart}
                onClick={handleGenerate}
              >
                Generate Report
              </button>
            </div>
          </div>

          <div className="reportright">
            <h2>Reports</h2>
            <p className="reportempty">Reports will appear here once generated.</p>
          </div>
        </div>

        {message && <p className="reportmessage">{message}</p>}

        <div className="reportbottom">
          <button className="reportcancelbtn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
