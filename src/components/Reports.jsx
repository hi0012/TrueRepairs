import React, { useState, useEffect, useRef } from "react";
import "../styles/Reports.css";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const API = "http://localhost:5000";

const priceToNumber = (v) => {
  if (!v) return 0;
  const s = String(v);
  if (/out of stock/i.test(s)) return 0;
  return Number(s.replace(/[^0-9.]/g, "")) || 0;
};

export default function Reports({ open, onClose }) {
  if (!open) return null;

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

  // multiple-report safe state
  const [activeReports, setActiveReports] = useState({});
  const [progressMap, setProgressMap] = useState({});
  

  const requestVersion = useRef(0);

  // Vehicles
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

  // Reports
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
    if (savedActive.length > 0) {
      setReports((prev) => [...savedActive, ...prev]);
      const activeMap = {};
      savedActive.forEach((r) => (activeMap[r._id] = true));
      setActiveReports(activeMap);
    }
  }, []);


  async function handleVehicleChange(e) {
    const vehicleId = e.target.value;
    const v = vehicles.find((veh) => veh._id === vehicleId);

    setSelectedVehicle(null);
    setSelectedCategory("");
    setSelectedPart("");
    setPartsList([]);
    setCategories([]);
    setSubcategories([]);

    if (!v) return;

    const engineValue = v.data?.engine?.engine_size || v.engine || "Unknown";
    const formattedEngine = engineValue.includes("L")
      ? engineValue
      : `${engineValue}L`;
    const selected = { ...v, engine: formattedEngine.trim() };
    setSelectedVehicle(selected);
    setMessage(`Selected ${selected.year} ${selected.make} ${selected.model}`);

    // Fetch categories
    setLoadingCategories(true);
    const currentVersion = ++requestVersion.current;
    try {
      const res = await fetch(`${API}/api/rockauto/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          make: selected.make,
          year: selected.year,
          model: selected.model,
          engine: selected.engine,
        }),
      });

      const data = await res.json();
      if (currentVersion !== requestVersion.current) return;

      if (data.categories) {
        setCategories(data.categories);
        setMessage(`Loaded ${data.categories.length} categories.`);
      } else {
        setCategories([]);
        setMessage("No categories found.");
      }
    } catch (err) {
      console.error("Category fetch error:", err);
      setMessage("Error fetching categories.");
    } finally {
      if (currentVersion === requestVersion.current)
        setLoadingCategories(false);
    }
  }

  async function handleCategoryChange(e) {
    const newCategory = e.target.value;
    setSelectedCategory(newCategory);
    setSelectedPart("");
    setSubcategories([]);
    if (!newCategory || !selectedVehicle) return;

    setLoadingSubcategories(true);
    const currentVersion = ++requestVersion.current;
    try {
      const res = await fetch(`${API}/api/rockauto/subcategories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          make: selectedVehicle.make,
          year: selectedVehicle.year,
          model: selectedVehicle.model,
          engine: selectedVehicle.engine,
          category: newCategory,
        }),
      });

      const data = await res.json();
      if (currentVersion !== requestVersion.current) return;

      if (data.subcategories) {
        setSubcategories(data.subcategories);
        setMessage(`Loaded ${data.subcategories.length} subcategories.`);
      } else {
        setSubcategories([]);
        setMessage("No subcategories found.");
      }
    } catch (err) {
      console.error("Subcategory fetch error:", err);
      setMessage("Error fetching subcategories.");
    } finally {
      if (currentVersion === requestVersion.current)
        setLoadingSubcategories(false);
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

    setPartsList([
      ...partsList,
      { category: selectedCategory, part: selectedPart, quantity: 1 },
    ]);
    setSelectedPart("");
    setMessage(`Added ${selectedPart} (${selectedCategory}) to list.`);
  }


  function handleRemovePart(index) {
    setPartsList(partsList.filter((_, i) => i !== index));
  }

  // handleGenerate
  async function handleGenerate() {
    if (!selectedVehicle) {
      setMessage("Please select a vehicle.");
      return;
    }
    if (partsList.length === 0) {
      setMessage("Add at least one part before generating.");
      return;
    }
    setPartsList([]);
    const vehicleId = selectedVehicle._id;
    const tempId = `temp-${Date.now()}`;

    // Create temporary "generating" report
    const tempReport = {
      _id: tempId,
      vehicle: selectedVehicle,
      title: `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model} (${partsList.length} parts)`,
      createdAt: new Date().toISOString(),
      isGenerating: true,
      progress: 0,
      total: partsList.length,
    };

    // Add it to the right panel immediately
    setReports((prev) => [tempReport, ...prev]);

    setActiveReports((prev) => ({ ...prev, [tempId]: true }));
    setProgressMap((prev) => ({
      ...prev,
      [tempId]: { done: 0, total: partsList.length },
    }));

    setMessage(`Generating report for ${selectedVehicle.make} ${selectedVehicle.model}...`);

    const partSummaries = [];
    const overallPrices = [];

    for (let i = 0; i < partsList.length; i++) {
      const item = partsList[i];
      const payload = {
        make: (selectedVehicle.make || "").toUpperCase(),
        year: selectedVehicle.year || "",
        model: (selectedVehicle.model || "").toUpperCase(),
        engine: (selectedVehicle.engine || "").toUpperCase(),
        category: (item.category || "").toUpperCase(),
        subcategory: (item.part || "").toUpperCase(),
      };

      try {
        const res = await fetch(`${API}/api/scrape-rockauto`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const raw = await res.text();
        let data;
        try {
          data = JSON.parse(raw);
        } catch {
          setReports((prev) =>
            prev.map((r) =>
              r._id === tempId
                ? { ...r, progress: i + 1, total: partsList.length }
                : r
            )
          );
          partSummaries.push({ name: item.part, low: 0, high: 0, avg: 0 });
          continue;
        }

        const rows = Array.isArray(data.parts)
          ? data.parts
          : Object.values(data.parts || {}).flat();

        const nums = rows
          .map((r) => priceToNumber(r.total || r.price || r.cost || r.amount))
          .filter((n) => Number.isFinite(n) && n > 0);

        if (!nums.length) {
          partSummaries.push({ name: item.part, low: 0, high: 0, avg: 0 });
        } else {
          const low = Math.min(...nums);
          const high = Math.max(...nums);
          const avg = nums.reduce((a, b) => a + b, 0) / nums.length;

          // multiply each by quantity
          const qty = item.quantity || 1;
          partSummaries.push({
            name: `${item.part} (x${qty})`,
            low: low * qty,
            high: high * qty,
            avg: avg * qty,
          });
          overallPrices.push(...nums.map((n) => n * qty));
        }
      } catch (err) {
        console.error("[REPORT] scrape error:", err);
        partSummaries.push({ name: item.part, low: 0, high: 0, avg: 0 });
      }

      // update live progress for this report
      setReports((prev) =>
        prev.map((r) =>
          r._id === tempId
            ? { ...r, progress: i + 1, total: partsList.length }
            : r
        )
      );
    }

    // Handle no data case safely
    if (overallPrices.length === 0) {
      setReports((prev) => prev.filter((r) => r._id !== tempId));
      setActiveReports((prev) => {
        const updated = { ...prev };
        delete updated[tempId];
        return updated;
      });
      setMessage("No prices found for selected parts (nothing saved).");
      return;
    }

    let totalLow = 0;
    let totalHigh = 0;
    let totalAvg = 0;

    for (const part of partSummaries) {
      totalLow += part.low || 0;
      totalHigh += part.high || 0;
      totalAvg += part.avg || 0;
    }

    const summary = {
      totalLow,
      totalHigh,
      totalAvg,
    };

    const title = `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model} (${partsList.length} parts)`;

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

      // Save to backend
      await fetch(`${API}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saveBody),
      });

      // Fetch updated list
      const r = await fetch(`${API}/api/reports?email=${encodeURIComponent(userEmail)}`);
      const j = await r.json();

      // Replace temp report with saved one
      const updatedReports = j.items || j.reports || [];
      setReports((prev) =>
        prev.map((r) =>
          r._id === tempId
            ? updatedReports.find(
                (saved) =>
                  saved.title === title &&
                  saved.vehicle?.make === selectedVehicle.make
              ) || r
            : r
        )
      );

      setMessage("Report saved!");
      setPartsList([]);
    } catch (e) {
      console.error("[REPORT] save report error:", e);
      setMessage("Report generated, but failed to save.");
    } finally {
      // clear active state
      setActiveReports((prev) => {
        const updated = { ...prev };
        delete updated[tempId];
        return updated;
      });    
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

  const canGenerate =
    !!selectedVehicle && partsList.length > 0 && !activeReports[selectedVehicle?._id];
  const disabledReason = !selectedVehicle
    ? "Select a vehicle"
    : partsList.length === 0
    ? "Add at least one part"
    : "";

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
                        <option key={sub.url || sub.name + i} value={sub.name}>
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
              disabled={
                !selectedVehicle ||
                partsList.length === 0 ||
                activeReports[selectedVehicle?._id]
              }
              title={
                !selectedVehicle
                  ? "Select a vehicle"
                  : partsList.length === 0
                  ? "Add at least one part"
                  : ""
              }
              onClick={handleGenerate}
            >
              {activeReports[selectedVehicle?._id]
                ? `Generating (${progressMap[selectedVehicle?._id]?.done || 0} / ${
                    progressMap[selectedVehicle?._id]?.total || 0
                  })...`
                : "Generate Report"}
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
                            <p>
                              Generating... {r.progress || 0}/{r.total || "?"}
                            </p>
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
                              onClick={() =>
                                setExpanded(open ? null : (r._id || i))
                              }
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


