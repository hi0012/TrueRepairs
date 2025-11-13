import React, { useState, useEffect, useRef } from "react";
import "../styles/Reports.css";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import vehicleData from "../data/toyotaFull.json";
import vehicleDataParts from "../../server/src/data/ToyotaParts.json";
import logo from "/logo.png";
import brand from "/TrueRepairs.png";
const API = "http://localhost:5000";

// Wrapper component
export default function Reports({ open, onClose }) {
  if (!open) return null;
  return <ReportsBody onClose={onClose} />;
}

// Core logic
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
  const [message, setMessage] = useState("");
  const [reports, setReports] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [generating, setGenerating] = useState(false);

  // Load user's vehicles
  useEffect(() => {
    if (!userEmail) return;
    (async () => {
      try {
        const res = await fetch(`${API}/api/vehicles?email=${encodeURIComponent(userEmail)}`);
        const data = await res.json();
        setVehicles(data.items || []);
      } catch (e) {
        console.error("Vehicle fetch error:", e);
      }
    })();
  }, [userEmail]);

  // Load user's reports
  useEffect(() => {
    if (!userEmail) return;
    (async () => {
      try {
        const res = await fetch(`${API}/api/reports?email=${encodeURIComponent(userEmail)}`);
        const data = await res.json();
        setReports(data.items || data.reports || []);
      } catch (e) {
        console.error("Report fetch error:", e);
      }
    })();
  }, [userEmail]);

  // Restore any saved "active" reports from localStorage
  useEffect(() => {
    const savedActive = JSON.parse(localStorage.getItem("activeReports") || "[]");
    if (Array.isArray(savedActive) && savedActive.length > 0) {
      setReports((prev) => [...savedActive, ...prev]);
    }
  }, []);

  // Vehicle select
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
    const yearEntry = vehicleData.find((y) => y.year === Number(year));
    if (!yearEntry) return setMessage("No data found for that year.");

    const modelEntry = yearEntry.models.find((m) => m.model.toUpperCase() === String(model).toUpperCase());
    if (!modelEntry) return setMessage("No data found for that model.");

    const engineEntry = modelEntry.engines.find((en) => en.engine.toUpperCase() === String(engine).toUpperCase());
    if (!engineEntry) return setMessage("No data found for that engine.");

    const categoryNames = engineEntry.categories.map((c) => c.category);
    setCategories(categoryNames);
    setMessage(`Loaded ${categoryNames.length} categories.`);
  }

  // Categories
  function handleCategoryChange(e) {
    const newCategory = e.target.value;
    setSelectedCategory(newCategory);
    setSelectedPart("");

    if (!selectedVehicle || !newCategory) return;
    const { year, model, engine } = selectedVehicle;

    const yearEntry = vehicleData.find((y) => y.year === Number(year));
    const modelEntry = yearEntry?.models.find((m) => m.model.toUpperCase() === String(model).toUpperCase());
    const engineEntry = modelEntry?.engines.find((en) => en.engine.toUpperCase() === String(engine).toUpperCase());
    const categoryEntry = engineEntry?.categories.find((c) => c.category === newCategory);

    if (categoryEntry) {
      setSubcategories(categoryEntry.parttypes.map((p) => ({ name: p })));
      setMessage(`Loaded ${categoryEntry.parttypes.length} parts.`);
    } else {
      setSubcategories([]);
      setMessage("No parts found for this category.");
    }
  }

  // Add parts
  function handleAddPart() {
    if (!selectedCategory || !selectedPart) return;

    const exists = partsList.some((p) => p.category === selectedCategory && p.part === selectedPart);
    if (exists) return setMessage("That part is already in the list.");

    setPartsList((prev) => [
      ...prev,
      { category: selectedCategory, part: selectedPart, quantity: 1 },
    ]);
    setSelectedPart("");
    setMessage(`Added ${selectedPart} (${selectedCategory}) to list.`);
  }

  // Remove parts
  function handleRemovePart(index) {
    setPartsList((prev) => prev.filter((_, i) => i !== index));
  }

  // Generate report
  async function handleGenerate() {
    if (!selectedVehicle) return setMessage("Please select a vehicle.");
    if (partsList.length === 0)
      return setMessage("Add at least one part before generating.");
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

    // add the temporary progress report
    setReports((prev) => [tempReport, ...prev]);
    setMessage(`Generating report for ${selectedVehicle.make} ${selectedVehicle.model}...`);

    const partSummaries = [];
    let foundCount = 0;

    try {
      // generate pricing summary
      for (let i = 0; i < partsList.length; i++) {
        const item = partsList[i];
        const qty = Math.max(1, Number(item.quantity) || 1);

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
            matches = (data?.parts || []).filter((p) => {
              const leaf = String(p.parttype || "").toUpperCase();
              const fam = String(p.category || "").toUpperCase();
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

        // aggregate or mark out-of-stock
        if (matches.length > 0) {
          const anyOutFlag = matches.some(
            (m) => m.in_stock === false || m.in_stock === 0 || m.in_stock === "0" || m.in_stock === "false"
          );

          // if all prices are 0 or missing, treat as out-of-stock
          const usable = matches.filter((m) => {
            const l = Number(m.low);
            const h = Number(m.high);
            const a = Number(m.avg);
            return (Number.isFinite(l) && l > 0) ||
                  (Number.isFinite(h) && h > 0) ||
                  (Number.isFinite(a) && a > 0);
          });

          if (anyOutFlag || usable.length === 0) {
            partSummaries.push({
              name: `${item.part} (x${qty})`,
              category: item.category,
              low: "Out of Stock",
              high: "Out of Stock",
              avg: "Out of Stock",
            });
          } else {
            const agg = usable.reduce(
              (acc, m) => {
                const l = Number(m.low);
                const h = Number(m.high);
                const a = Number(m.avg);
                acc.low  += Number.isFinite(l) && l > 0 ? l : 0;
                acc.high += Number.isFinite(h) && h > 0 ? h : 0;
                acc.avg  += Number.isFinite(a) && a > 0 ? a : 0;
                return acc;
              },
              { low: 0, high: 0, avg: 0 }
            );

            // if totals end up 0/0/0, mark as Out of Stock
            const lowFinal  = Number((agg.low  * qty).toFixed(2));
            const highFinal = Number((agg.high * qty).toFixed(2));
            const avgFinal  = Number((agg.avg  * qty).toFixed(2));

            if (lowFinal === 0 && highFinal === 0 && avgFinal === 0) {
              partSummaries.push({
                name: `${item.part} (x${qty})`,
                category: item.category,
                low: "Out of Stock",
                high: "Out of Stock",
                avg: "Out of Stock",
              });
            } else {
              partSummaries.push({
                name: `${item.part} (x${qty})`,
                category: item.category,
                low: lowFinal,
                high: highFinal,
                avg: avgFinal,
              });
              foundCount++;
            }
          }
        } else {
          partSummaries.push({
            name: `${item.part} (x${qty})`,
            category: item.category,
            low: "Out of Stock",
            high: "Out of Stock",
            avg: "Out of Stock",
          });
        }

        // update progress bar live
        setReports((prev) =>
          prev.map((r) =>
            r._id === tempId ? { ...r, progress: i + 1 } : r
          )
        );
      }

      // nothing found? remove the temp report
      if (foundCount === 0) {
        setReports((prev) => prev.filter((r) => r._id !== tempId));
        setMessage("No prices found for selected parts (nothing saved).");
        return;
      }

      // === totals ===
      const totals = partSummaries.reduce(
        (acc, p) => {
          if (typeof p.low === "number") acc.low += p.low;
          if (typeof p.high === "number") acc.high += p.high;
          if (typeof p.avg === "number") acc.avg += p.avg;
          return acc;
        },
        { low: 0, high: 0, avg: 0 }
      );

      const summary = {
        totalLow: Number(totals.low.toFixed(2)),
        totalHigh: Number(totals.high.toFixed(2)),
        totalAvg: Number(totals.avg.toFixed(2)),
      };

      // === save to backend ===
      const saveBody = {
        title: tempReport.title,
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

      const response = await fetch(`${API}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saveBody),
      });

      if (!response.ok) throw new Error("Failed to save report");
      const savedReport = await response.json();

      // Force a clean re-render
      setReports((prev) => {
        // filter out the temporary one
        const withoutTemp = prev.filter((r) => r._id !== tempId);

        // build a brand-new finished object
        const finished = {
          ...savedReport,
          title: tempReport.title,
          parts: partSummaries,
          summary,
          vehicle: selectedVehicle,
          createdAt: savedReport.createdAt || new Date().toISOString(),
          isGenerating: false,
          progress: partsList.length,
          total: partsList.length,
        };

        // prepend to list
        return [finished, ...withoutTemp];
      });


      setMessage("Report saved!");
    } catch (e) {
      console.error("[REPORT] save report error:", e);
      setMessage("Report generated, but failed to save.");
    } finally {
      setGenerating(false);
      setPartsList([]);
    }

    // Refresh reports from backend after save
    const updated = await fetch(`${API}/api/reports?email=${encodeURIComponent(userEmail)}`);
    const freshData = await updated.json();
    setReports(freshData.items || freshData.reports || []);

  }

  //Find matching part details from ToyotaParts.json
  function findPartDetailsSmart(vehicle, preferredCategory, partName, data = vehicleDataParts) {
    const norm = (s) => String(s ?? "") .toUpperCase() .replace(/&/g, "AND") .replace(/[^A-Z0-9]+/g, " ") .replace(/\s+/g, " ") .trim();
    const findKeyCI = (obj, target) => {
      if (!obj || !target) return null;
      const want = norm(target);

      // exact first
      for (const k of Object.keys(obj)) {
        if (norm(k) === want) return k;
      }

      // then match-includes both ways
      for (const k of Object.keys(obj)) {
        const nk = norm(k);
        if (nk.includes(want) || want.includes(nk)) return k;
      }

      return null;
    };

    // object vs array schema support
    const pickBucket = (node) => node?.parttypes ?? node?.partTypes ?? node;

    if (!data) {
      return { items: [], usedCategory: null, usedPartKey: null };
    }

    // Get the correct engine node from the JSON
    const getEngineNode = () => {
      if (Array.isArray(data)) {
        const yearEntry =
          data.find((y) => String(y.year) === String(vehicle.year)) ??
          data.find((y) => norm(y.year) === norm(vehicle.year));
        if (!yearEntry) return null;

        const modelEntry =
          yearEntry.models.find((m) => norm(m.model) === norm(vehicle.model)) ??
          yearEntry.models.find((m) => norm(m.model).includes(norm(vehicle.model)));
        if (!modelEntry) return null;

        const engineEntry =
          modelEntry.engines.find((e) => norm(e.engine) === norm(vehicle.engine)) ??
          modelEntry.engines.find((e) => norm(e.engine).includes(norm(vehicle.engine)));
        if (!engineEntry) return null;

        return engineEntry;
      }

      // Old nested object format
      const yearKey = data[String(vehicle.year)] != null ? String(vehicle.year) : findKeyCI(data, vehicle.year);
      if (!yearKey) return null;

      const yearNode = data[yearKey];
      const modelKey = findKeyCI(yearNode, vehicle.model);
      if (!modelKey) return null;

      const modelNode = yearNode[modelKey];
      const engineKey = findKeyCI(modelNode, vehicle.engine);
      if (!engineKey) return null;

      return modelNode[engineKey];
    };

    const engineNode = getEngineNode();
    if (!engineNode) {
      return { items: [], usedCategory: null, usedPartKey: null };
    }

    // Categories can be nested under engine.categories OR directly in engine
    const catsNode = engineNode.categories ?? engineNode;
    if (!catsNode || typeof catsNode !== "object") {
      return { items: [], usedCategory: null, usedPartKey: null };
    }

    const allCatKeys = Object.keys(catsNode);
    const orderedCats = [];

    // Try preferred category first
    if (preferredCategory) {
      const prefKey = findKeyCI(catsNode, preferredCategory);
      if (prefKey) orderedCats.push(prefKey);
    }

    // Add all categories
    for (const k of allCatKeys) {
      if (!orderedCats.includes(k)) orderedCats.push(k);
    }

    // Try to match the part name inside each category bucket
    for (const ck of orderedCats) {
      const catNode = catsNode[ck];
      const bucket = pickBucket(catNode);

      if (!bucket || typeof bucket !== "object") continue;

      const partKey = findKeyCI(bucket, partName);
      const matches = partKey ? bucket[partKey] : null;

      if (Array.isArray(matches) && matches.length > 0) {
        return { items: matches, usedCategory: ck, usedPartKey: partKey };
      }
    }

    return { items: [], usedCategory: orderedCats[0] ?? null, usedPartKey: null };
  }

  // Download report
  async function handleDownload(r) {
    setExpanded(r._id);

    // Wait for report DOM element
    let element = null;
    for (let i = 0; i < 40; i++) {
      element = document.getElementById(`report-${r._id}`);
      if (element) break;
      await new Promise((res) => setTimeout(res, 50));
    }
    if (!element) {
      setMessage("Unable to locate report for download.");
      return;
    }

    try {

      // Load logos
      const logoImg = new Image(); logoImg.src = logo;
      const brandImg = new Image(); brandImg.src = brand;
      await Promise.all([logoImg.decode(), brandImg.decode()]);

      // Snapshot of the report (keeps your style)
      const canvas = await html2canvas(element, {scale: 2, backgroundColor: "#ffffff", useCORS: true,});
      const imgData = canvas.toDataURL("image/png");

      // PDF setup
      const pdf = new jsPDF("p", "pt", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 40;
      const dateStr = new Date().toLocaleString();

      // Header
      const logoY = 30;
      pdf.addImage(logoImg, "PNG", margin, logoY, 45, 45);
      pdf.addImage(brandImg, "PNG", margin + 45, logoY - 20, 100, 100);
      pdf.setFontSize(11);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Date: ${dateStr}`, pdfWidth - 170, logoY + 20);
      pdf.setFontSize(18);
      pdf.text("TrueRepairs Report", margin, 100);
      pdf.setFontSize(13);
      pdf.text(`${r.vehicle?.year || ""} ${r.vehicle?.make || ""} ${r.vehicle?.model || ""} (${r.parts?.length || 0} parts)`, margin, 118);

      // Snapshot sizing
      let imgWidth = pdfWidth - 2 * margin;
      let pageHeight = pdfHeight - 180;
      let imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 135;

      // Add first chunk of image
      pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Auto-paging for tall reports
      while (heightLeft > 0) {
        pdf.addPage();
        pdf.addImage(imgData, "PNG", margin, -imgHeight + heightLeft + 135, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Quick Links Header
      pdf.setFontSize(11);
      pdf.setTextColor(0, 0, 0);
      let linkY = 135 + imgHeight + 25;
      pdf.text("Quick Links:", margin, linkY);

      // Collect 1 unique URL per category
      const uniqueLinks = new Map();

      for (const p of r.parts || []) {

        // Clean part name
        const cleanName = (p.name || "").split("(")[0].trim();

        // Lookup matching JSON details
        const { items } = findPartDetailsSmart(r.vehicle, p.category, cleanName);

        // If the JSON item had a URL, store once per category
        if (items && items.length > 0 && items[0].url) {
          const url = items[0].url;
          const cat = p.category || cleanName;
          if (!uniqueLinks.has(cat)) {
            uniqueLinks.set(cat, url);
          }
        }
      }

      // Print QuickLinks
      for (const [cat, url] of uniqueLinks) {
        linkY += 15;
        pdf.textWithLink(`• ${cat}`, margin + 10, linkY, {url});
      }

      // Detailed Breakdown Page
      pdf.addPage();
      pdf.setFontSize(16);
      pdf.text("Detailed Part Breakdown", margin, 60);
      let y = 90;

      pdf.setFontSize(12);

      // Loop each part for breakdown
      for (const p of r.parts || []) {

        // Page break if close to bottom
        if (y > pdfHeight - 150) {
          pdf.addPage();
          y = 60;
        }

        // Strip (x1), (x2) etc
        const cleanPart = (p.name || "").split("(")[0].trim();

        // Smart JSON lookup
        const { items: details, usedCategory } = findPartDetailsSmart(r.vehicle, p.category, cleanPart);

        // Section Header
        const headerCategory = usedCategory || p.category || "Unknown";
        pdf.setFontSize(14);
        pdf.text(`${headerCategory} - ${p.name || "Unknown"}`, margin, y);
        y += 10;
        pdf.setDrawColor(200);
        pdf.line(margin, y, pdfWidth - margin, y);
        y += 10;

        // Part details from JSON
        if (details.length > 0) {

          for (const item of details) {
            pdf.setFontSize(11);
            pdf.text(`Brand: ${item.brand ?? "N/A"}`, margin, y); y += 14;
            pdf.text(`Part #: ${item.partnumber ?? "N/A"}`, margin, y); y += 14;
            pdf.text(`Description: ${item.description ?? "N/A"}`, margin, y, {maxWidth: pdfWidth - 2 * margin}); y += 14;
            pdf.text(`Price: ${item.price != null ? `$${Number(item.price).toFixed(2)}` : "N/A"}`, margin, y); y += 14;
            pdf.text(`Availability: ${item.in_stock ? "In Stock" : "Out of Stock"}`, margin, y); y += 22;
          }

        } else {
          // No match
          pdf.setFontSize(11);
          pdf.text("No detailed items found for this part.", margin, y);
          y += 20;
        }
      }

      // Footer
      pdf.setFontSize(10);
      pdf.text("Generated with TrueRepairs | Estimate data from RockAuto.com", margin, pdfHeight - 40);

      // Save PDF
      pdf.save(`TrueRepairs_Report_${r.vehicle?.make || ""}_${r.vehicle?.model || ""}.pdf`);
      setMessage("PDF downloaded successfully.");

    } catch (err) {
      console.error("PDF generation failed:", err);
      setMessage("Failed to generate PDF.");
    }
  }
  const canGenerate = !!selectedVehicle && partsList.length > 0 && !generating;

  // Delete a report
  async function handleDeleteReport(id) {
    try {
      // Send delete request to backend
      const res = await fetch(`${API}/api/reports/${id}`, { method: "DELETE" });

      if (!res.ok) {
        throw new Error("Failed to delete report");
      }

      // Remove the deleted report from state
      setReports((prev) => prev.filter((r) => r._id !== id));

      setMessage("Report deleted successfully.");
    } catch (e) {
      console.error("Delete report failed:", e);
      setMessage("Failed to delete report. Please try again.");
    }
  }

  return (
    <div className="reportoverlay" onClick={onClose}>
      <div className="reportpopup" onClick={(e) => e.stopPropagation()}>
          <div className="reportheader">
            <h1>Vehicle Reports</h1>
            <p>Generate and save unique repair cost reports for your vehicles.</p>
          </div>
        <div className="reportcontent">  

          <div className="reportcolumns">
            {/* LEFT SIDE */}
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

                {/* Vehicle Info */}
                <div className="reportselected spaced">
                  {selectedVehicle ? (<>
                      <p><strong>Year:</strong> {selectedVehicle.year}</p>
                      <p><strong>Make:</strong> {selectedVehicle.make}</p>
                      <p><strong>Model:</strong> {selectedVehicle.model}</p>
                      <p><strong>Engine:</strong> {selectedVehicle.engine}</p>
                    </>) : (<p className="reportplaceholder">Select a vehicle above.</p>)
                  }
                </div>

                {/* Category */}
                <div className="reportselectfield">
                  <label>Area of Car:</label>
                  <select
                    value={selectedCategory}
                    onChange={handleCategoryChange}
                    disabled={!categories.length}>
                    <option value="">Select Area</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Subcategory */}
                <div className="reportselectfield">
                  <label>Part:</label>
                  <div className="reportpartadd">
                    <select
                      value={selectedPart}
                      onChange={(e) => setSelectedPart(e.target.value)}
                      disabled={!subcategories.length}>
                      <option value="">Select Part</option>
                      {subcategories.map((sub, i) => (
                        <option key={i} value={sub.name}>{sub.name}</option>
                      ))}
                    </select>
                    <button className="reportaddbtn" onClick={handleAddPart} disabled={!selectedPart}> Add </button>
                  </div>
                </div>

                {/* Parts List */}
                <div className="reportpartslist scrollbox">
                  <h3>Selected Parts:</h3>
                  {partsList.length === 0 ? (
                    <p className="reportempty">No parts added yet.</p>) : (
                    <ul>
                      {partsList.map((item, i) => (
                        <li key={`${item.category}-${item.part}-${i}`}>
                          <span>{item.category} - {item.part}</span>
                          <div className="quantity-controls">
                            <label>Qty:</label>
                            <input type="number" min="1" value={item.quantity} onChange={(e) => {

                              const newQty = Math.max(1, parseInt(e.target.value) || 1);
                              setPartsList((prev) =>
                                prev.map((p, idx) => idx === i ? { ...p, quantity: newQty } : p)
                              );
                            }}/>
                            <button onClick={() => handleRemovePart(i)}>Remove</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <button className="reportgeneratebtn" disabled={!canGenerate} onClick={handleGenerate}> {generating ? "Generating..." : "Generate Report"} </button>
              </div>
            </div>

            {/* RIGHT SIDE */}
            <div className="reportright">
              <h2>Reports</h2>
              {reports.length === 0 ? (
                <p className="reportempty">No reports generated yet.</p>) : (
                  <ul className="RepList">
                    {reports.map((r, i) => {
                      const open = expanded === (r._id || i);
                      return (
                        <li
                          key={r._id || i}
                          className={`RepItem ${r.isGenerating ? "generating" : ""}`} >
                            {r.isGenerating ? (<>
                              <div className="RepItemHeader">
                                <div>
                                  <strong>{r.title}</strong>
                                  <p>Generating... {r.progress}/{r.total}</p>
                                </div>
                              </div>
                              <div className="progress-bar-container small">
                                <div className="progress-bar-fill" style={{ width: `${(r.progress / r.total) * 100}%` }}/>
                              </div></>) : (<>
                              <div className="RepItemHeader">
                                <div> 
                                  <strong>{r.title}</strong>
                                  <p>Date: {new Date(r.createdAt).toLocaleString()}</p>
                                </div>
                                <div className="RepActions">
                                  <button className="RepViewBtn" onClick={() => setExpanded(open ? null : (r._id || i))} >
                                    {open ? "Hide" : "View"}
                                  </button>
                                  <button className="RepDownloadBtn" onClick={() => handleDownload(r)}>Download</button>
                                  <button className="RepDeleteBtn" onClick={() => handleDeleteReport(r._id)}>Delete</button>
                                </div>
                              </div>

                              {/* Always render report div, just toggle visibility */}
                              <div id={`report-${r._id}`} className={`RepDropdown ${open ? "visible" : "hidden"}`} style={{ display: open ? "block" : "none" }}>
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
                                        <td>
                                          {typeof p.low === "string"
                                            ? p.low
                                            : Number(p.low).toFixed(2)}
                                        </td>
                                        <td>
                                          {typeof p.high === "string"
                                            ? p.high
                                            : Number(p.high).toFixed(2)}
                                        </td>
                                        <td>
                                          {typeof p.avg === "string"
                                            ? p.avg
                                            : Number(p.avg).toFixed(2)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>

                                <div className="reportsummary">
                                  <p>
                                    <strong>Total Low:</strong> $
                                    {Number(r.summary?.totalLow || 0).toFixed(2)}
                                  </p>
                                  <p>
                                    <strong>Total High:</strong> $
                                    {Number(r.summary?.totalHigh || 0).toFixed(2)}
                                  </p>
                                  <p>
                                    <strong>Average:</strong> $
                                    {Number(r.summary?.totalAvg || 0).toFixed(2)}
                                  </p>
                                </div>
                              </div>
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
        </div>

        <div className="reportbottom">
          <button className="reportcancelbtn" onClick={onClose}>Cancel</button>
        </div>

      </div>
    </div>
  );

}
