import React, { useState, useEffect, useRef } from "react";
import "../styles/Reports.css";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import vehicleData from "../data/toyotaFull.json";

const API = "http://localhost:5000";

const priceToNumber = (v) => {
  if (!v) return 0;
  const s = String(v);
  if (/out of stock/i.test(s)) return 0;
  return Number(s.replace(/[^0-9.]/g, "")) || 0;
};

// Wrapper component
export default function Reports({ open, onClose }) {
  if (!open) return null;
  return <ReportsBody onClose={onClose} />;
}

// hooks and logic
function ReportsBody({ onClose }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userEmail = user?.email || "";

  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedPart, setSelectedPart] = useState("");
  const [partsList, setPartsList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  const [message, setMessage] = useState("");
  const [reports, setReports] = useState([]);
  const [expanded, setExpanded] = useState(null);

  // prevent double-submits
  const [generating, setGenerating] = useState(false);

  const requestVersion = useRef(0);

  // Load user's vehicles
  useEffect(() => {
    if (!userEmail) return;
    (async () => {
      try {
        const res = await fetch(
          `${API}/api/vehicles?email=${encodeURIComponent(userEmail)}`
        );
        const data = await res.json();
        setVehicles(data.items || []);
      } catch (e) {
        console.error("Vehicle fetch error:", e);
      }
    })();
  }, [userEmail]);

  // Load existing reports
  useEffect(() => {
    if (!userEmail) return;
    (async () => {
      try {
        const res = await fetch(
          `${API}/api/reports?email=${encodeURIComponent(userEmail)}`
        );
        const data = await res.json();
        setReports(data.items || data.reports || []);
      } catch (e) {
        console.error("Report fetch error:", e);
      }
    })();
  }, [userEmail]);

  // Restore any active reports from localStorage
  useEffect(() => {
    const savedActive = JSON.parse(localStorage.getItem("activeReports") || "[]");
    if (Array.isArray(savedActive) && savedActive.length > 0) {
      setReports((prev) => [...savedActive, ...prev]);
    }
  }, []);

  async function handleVehicleChange(e) {
    const vehicleId = e.target.value;
    const v = vehicles.find((veh) => veh._id === vehicleId);
    if (!v) return;

    setSelectedVehicle(v);
    setSelectedCategory("");
    setSelectedPart("");
    setPartsList([]);
    setCategories([]);
    setSubcategories([]);

    const { year, model, engine } = v;

    // Lookup from local JSON
    const yearEntry = vehicleData.find((y) => y.year === Number(year));
    if (!yearEntry) return setMessage("No data found for that year.");

    const modelEntry = yearEntry.models.find(
      (m) => m.model.toUpperCase() === String(model).toUpperCase()
    );
    if (!modelEntry) return setMessage("No data found for that model.");

    const engineEntry = modelEntry.engines.find(
      (en) => en.engine.toUpperCase() === String(engine).toUpperCase()
    );
    if (!engineEntry) return setMessage("No data found for that engine.");

    const categoryNames = engineEntry.categories.map((c) => c.category);
    setCategories(categoryNames);
    setMessage(`Loaded ${categoryNames.length} categories.`);
  }

  function handleCategoryChange(e) {
    const newCategory = e.target.value;
    setSelectedCategory(newCategory);
    setSelectedPart("");

    if (!selectedVehicle || !newCategory) return;

    const { year, model, engine } = selectedVehicle;
    const yearEntry = vehicleData.find((y) => y.year === Number(year));
    const modelEntry = yearEntry?.models.find(
      (m) => m.model.toUpperCase() === String(model).toUpperCase()
    );
    const engineEntry = modelEntry?.engines.find(
      (en) => en.engine.toUpperCase() === String(engine).toUpperCase()
    );
    const categoryEntry = engineEntry?.categories.find(
      (c) => c.category === newCategory
    );

    if (categoryEntry) {
      setSubcategories(categoryEntry.parttypes.map((p) => ({ name: p })));
      setMessage(`Loaded ${categoryEntry.parttypes.length} parts.`);
    } else {
      setSubcategories([]);
      setMessage("No parts found for this category.");
    }
  }

  function handleAddPart() {
    if (!selectedCategory || !selectedPart) return;

    const exists = partsList.some(
      (p) => p.category === selectedCategory && p.part === selectedPart
    );
    if (exists) {
      setMessage("That part is already in the list.");
      return;
    }

    setPartsList((prev) => [
      ...prev,
      { category: selectedCategory, part: selectedPart, quantity: 1 },
    ]);
    setSelectedPart("");
    setMessage(`Added ${selectedPart} (${selectedCategory}) to list.`);
  }

  function handleRemovePart(index) {
    setPartsList((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleGenerate() {
    if (!selectedVehicle) {
      setMessage("Please select a vehicle.");
      return;
    }
    if (partsList.length === 0) {
      setMessage("Add at least one part before generating.");
      return;
    }
    if (generating) return;

    setGenerating(true);

    const tempId = `temp-${Date.now()}`;
    const tempReport = {
      _id: tempId,
      vehicle: selectedVehicle,
      title: `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model} (${partsList.length} parts)`,
      createdAt: new Date().toISOString(),
      isGenerating: true,
      progress: 0,
      total: partsList.length,
    };

    setReports((prev) => [tempReport, ...prev]);
    setMessage(`Generating report for ${selectedVehicle.make} ${selectedVehicle.model}...`);

    const partSummaries = [];
    let foundCount = 0;

    try {
      for (let i = 0; i < partsList.length; i++) {
        const item = partsList[i];
        const qty = Math.max(1, Number(item.quantity) || 1);

        // Query by PARTTYPE only
        const qs = new URLSearchParams({
          year: String(selectedVehicle.year || ""),
          model: String(selectedVehicle.model || ""),
          engine: String(selectedVehicle.engine || ""),
          parttype: String(item.part || ""),
        }).toString();

        let matches = [];
        try {
          const res = await fetch(`${API}/api/reports/local?${qs}`);
          if (res.ok) {
            const data = await res.json();
            const target = String(item.part || "").toUpperCase();
            // Keep only clearly-related rows
            matches = (data?.parts || []).filter((p) => {
              const leaf = String(p.parttype || "").toUpperCase();
              const fam  = String(p.category || "").toUpperCase();
              return (
                leaf === target ||
                fam === target ||
                leaf.includes(target) ||
                target.includes(leaf)
              );
            });
          }
        } catch (e) {
          console.error("[REPORT] /local fetch failed:", e);
        }

        if (matches.length > 0) {
          // Aggregate multiple leaves under the same family
          const agg = matches.reduce(
            (acc, m) => {
              acc.low  += Number(m.low  || 0);
              acc.high += Number(m.high || 0);
              acc.avg  += Number(m.avg  || 0);
              return acc;
            },
            { low: 0, high: 0, avg: 0 }
          );

          partSummaries.push({
            name: `${item.part} (x${qty})`,
            category: item.category,
            low:  Number((agg.low  * qty).toFixed(2)),
            high: Number((agg.high * qty).toFixed(2)),
            avg:  Number((agg.avg  * qty).toFixed(2)),
          });
          foundCount += 1;
        } else {
          partSummaries.push({
            name: `${item.part} (x${qty})`,
            category: item.category,
            low: 0,
            high: 0,
            avg: 0,
          });
        }

        // progress tick
        setReports((prev) =>
          prev.map((r) =>
            r._id === tempId ? { ...r, progress: i + 1, total: partsList.length } : r
          )
        );
      }

      // If nothing found at all, drop the temp and bail.
      if (foundCount === 0) {
        setReports((prev) => prev.filter((r) => r._id !== tempId));
        setMessage("No prices found for selected parts (nothing saved).");
        return;
      }

      // Totals
      const totalLow  = partSummaries.reduce((a, b) => a + (Number(b.low)  || 0), 0);
      const totalHigh = partSummaries.reduce((a, b) => a + (Number(b.high) || 0), 0);
      const totalAvg  = partSummaries.reduce((a, b) => a + (Number(b.avg)  || 0), 0);

      const summary = {
        totalLow:  Number(totalLow.toFixed(2)),
        totalHigh: Number(totalHigh.toFixed(2)),
        totalAvg:  Number(totalAvg.toFixed(2)),
      };

      const title = `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model} (${partsList.length} parts)`;

      // Save the report
      try {
        const saveBody = {
          title,
          userEmail,
          vehicle: {
            year: selectedVehicle.year,
            make: selectedVehicle.make,
            model: selectedVehicle.model,
            engine: selectedVehicle.engine,
          },
          parts: partSummaries,
          summary,
        };

        await fetch(`${API}/api/reports`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(saveBody),
        });

        const updatedReports = await fetch(
          `${API}/api/reports?email=${encodeURIComponent(userEmail)}`
        );
        const j = await updatedReports.json();

        setReports((prev) =>
          prev.map((r) =>
            r._id === tempId
              ? (j.items || j.reports || []).find(
                  (saved) =>
                    saved.title === title &&
                    (saved.vehicle?.make || "").toUpperCase() ===
                      (selectedVehicle.make || "").toUpperCase()
                ) || r
              : r
          )
        );

        setMessage("Report saved!");
      } catch (e) {
        console.error("[REPORT] save report error:", e);
        setMessage("Report generated, but failed to save.");
      }
    } finally {
      setGenerating(false);
    }
  }


  async function downloadPDF(reportId) {
    const element = document.getElementById(`report-${reportId}`);
    if (!element) return;
    const canvas = await html2canvas(element);
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "pt", "a4");
    pdf.addImage(imgData, "PNG", 20, 20, 560, 0);
    pdf.save(`TrueRepairs_Report_${reportId}.pdf`);
  }

  function handleDownload(r) {
    setExpanded(r._id);
    // Give the DOM a tick to expand before snapshotting
    setTimeout(() => downloadPDF(r._id), 120);
  }

  async function handleDeleteReport(id) {
    try {
      await fetch(`${API}/api/reports/${id}`, { method: "DELETE" });
      setReports((prev) => prev.filter((x) => x._id !== id));
    } catch (e) {
      console.error("Delete report failed:", e);
    }
  }

  const canGenerate = !!selectedVehicle && partsList.length > 0 && !generating;

  return (
    <div className="reportoverlay" onClick={onClose}>
      <div className="reportpopup" onClick={(e) => e.stopPropagation()}>
        <div className="reportheader">
          <h1>Vehicle Reports</h1>
          <p>Generate and save unique repair cost reports for your vehicles.</p>
        </div>

        <div className="reportcolumns">
          {/* LEFT: generator */}
          <div className="reportleft">
            <div className="reportbox reportgeneratebox">
              <h2>Generate Report</h2>

              {/* Vehicle select */}
              <div className="reportselectfield">
                <label>Select Vehicle:</label>
                <select
                  value={selectedVehicle?._id || ""}
                  onChange={handleVehicleChange}
                >
                  <option value="">Select Vehicle</option>
                  {vehicles.map((v) => (
                    <option key={v._id} value={v._id}>
                      {v.year} {v.make} {v.model}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vehicle info */}
              <div className="reportselected spaced">
                {selectedVehicle ? (
                  <>
                    <p><strong>Year:</strong> {selectedVehicle.year}</p>
                    <p><strong>Make:</strong> {selectedVehicle.make}</p>
                    <p><strong>Model:</strong> {selectedVehicle.model}</p>
                    <p><strong>Engine:</strong> {selectedVehicle.engine}</p>
                    <p><strong>Fuel:</strong> {selectedVehicle.fuel || selectedVehicle.data?.fuel?.fuel_type || "-"}</p>
                    <p><strong>Drivetrain:</strong> {selectedVehicle.drivetrain || selectedVehicle.data?.drivetrain?.drive_type || "-"}</p>
                  </>
                ) : (
                  <p className="reportplaceholder">Select a vehicle above.</p>
                )}
              </div>

              {/* Category */}
              <div className="reportselectfield">
                <label>Area of Car:</label>
                <select
                  value={selectedCategory}
                  onChange={handleCategoryChange}
                  disabled={loadingCategories || !categories.length}
                >
                  {loadingCategories ? (
                    <option>Loading categories...</option>
                  ) : (
                    <>
                      <option value="">Select Area</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              {/* Subcategory */}
              <div className="reportselectfield">
                <label>Part:</label>
                <div className="reportpartadd">
                  <select
                    value={selectedPart}
                    onChange={(e) => setSelectedPart(e.target.value)}
                    disabled={loadingSubcategories || !subcategories.length}
                  >
                    {loadingSubcategories ? (
                      <option>Loading parts...</option>
                    ) : (
                      <>
                        <option value="">Select Part</option>
                        {subcategories.map((sub, i) => (
                          <option key={sub.name + i} value={sub.name}>
                            {sub.name}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  <button
                    className="reportaddbtn"
                    onClick={handleAddPart}
                    disabled={!selectedPart}
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Parts list */}
              <div className="reportpartslist scrollbox">
                <h3>Selected Parts:</h3>
                {partsList.length === 0 ? (
                  <p className="reportempty">No parts added yet.</p>
                ) : (
                  <ul>
                    {partsList.map((item, i) => (
                      <li key={`${item.category}-${item.part}-${i}`}>
                        <span>{item.category} - {item.part}</span>
                        <div className="quantity-controls">
                          <label>Qty:</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const newQty = Math.max(1, parseInt(e.target.value) || 1);
                              setPartsList((prev) =>
                                prev.map((p, idx) =>
                                  idx === i ? { ...p, quantity: newQty } : p
                                )
                              );
                            }}
                          />
                          <button onClick={() => handleRemovePart(i)}>Remove</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Generate button */}
              <button
                className="reportgeneratebtn"
                disabled={!canGenerate}
                title={
                  !selectedVehicle
                    ? "Select a vehicle"
                    : partsList.length === 0
                    ? "Add at least one part"
                    : generating
                    ? "Generating..."
                    : ""
                }
                onClick={handleGenerate}
              >
                {generating ? "Generating..." : "Generate Report"}
              </button>
            </div>
          </div>

          {/* RIGHT: Reports list */}
          <div className="reportright">
            <h2>Reports</h2>

            {reports.length === 0 ? (
              <p className="reportempty">No reports generated yet.</p>
            ) : (
              <ul className="RepList">
                {reports.map((r, i) => {
                  const title = `${r.vehicle?.year || ""} ${r.vehicle?.make || ""} ${r.vehicle?.model || ""}`.trim();
                  const open = expanded === (r._id || i);

                  return (
                    <li key={r._id || i} className={`RepItem ${r.isGenerating ? "generating" : ""}`}>
                      {r.isGenerating ? (
                        <>
                          <div className="RepItemHeader">
                            <div>
                              <strong>{r.title}</strong>
                              <p>Generating... {r.progress || 0}/{r.total || "?"}</p>
                            </div>
                          </div>
                          <div className="progress-bar-container small">
                            <div
                              className="progress-bar-fill"
                              style={{
                                width: `${(r.progress / (r.total || 1)) * 100}%`,
                              }}
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="RepItemHeader">
                            <div>
                              <strong>{title || r.title}</strong>
                              <p>Date: {new Date(r.createdAt).toLocaleString()}</p>
                            </div>
                            <div className="RepActions">
                              <button
                                className="RepViewBtn"
                                onClick={() => setExpanded(open ? null : (r._id || i))}
                              >
                                {open ? "Hide" : "View"}
                              </button>
                              <button
                                className="RepDownloadBtn"
                                onClick={() => handleDownload(r)}
                              >
                                Download
                              </button>
                              <button
                                className="RepDeleteBtn"
                                onClick={() => handleDeleteReport(r._id)}
                              >
                                Delete
                              </button>
                            </div>
                          </div>

                          {open && (
                            <div id={`report-${r._id}`} className="RepDropdown">
                              <table className="reporttable">
                                <thead>
                                  <tr>
                                    <th>Part</th>
                                    <th>Low ($)</th>
                                    <th>High ($)</th>
                                    <th>Average ($)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(r.parts || []).map((p, idx) => (
                                    <tr key={idx}>
                                      <td>{p.name || "Unknown"}</td>
                                      <td>{Number(p.low ?? 0).toFixed(2)}</td>
                                      <td>{Number(p.high ?? 0).toFixed(2)}</td>
                                      <td>{Number(p.avg ?? 0).toFixed(2)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>

                              <div className="reportsummary">
                                <p>
                                  <strong>Total Low:</strong>{" "}
                                  ${Number(r.summary?.totalLow || 0).toFixed(2)}
                                </p>
                                <p>
                                  <strong>Total High:</strong>{" "}
                                  ${Number(r.summary?.totalHigh || 0).toFixed(2)}
                                </p>
                                <p>
                                  <strong>Average:</strong>{" "}
                                  ${Number(r.summary?.totalAvg || 0).toFixed(2)}
                                </p>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
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
