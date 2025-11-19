import React, { useState, useEffect} from "react";
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
const safe = (val) => {
  if (val === null || val === undefined || val === "") return "-";
  // Explicitly treat 0 as out of stock
  if (val === 0 || val === "0") return "Out of Stock";
  // If string but not numeric, return it directly
  if (typeof val === "string" && isNaN(Number(val))) return val;
  // Otherwise numeric formatting
  return Number(val).toFixed(2);
  };

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

  function getEngineEntry(vehicle, data = vehicleData) {
    if (!vehicle) return null;

    const yearEntry = data.find((y) => y.year === Number(vehicle.year));
    if (!yearEntry) return null;

    const modelEntry = yearEntry.models.find(
      (m) => m.model.toUpperCase() === String(vehicle.model).toUpperCase()
    );
    if (!modelEntry) return null;

    const engineEntry = modelEntry.engines.find(
      (en) => en.engine.toUpperCase() === String(vehicle.engine).toUpperCase()
    );
    return engineEntry || null;
  }

  // Vehicle select
  async function handleVehicleChange(e) {
    const vehicleId = e.target.value;
    const v = vehicles.find((veh) => veh._id === vehicleId);
    if (!v) return;

    // Reset UI
    setSelectedVehicle(v);
    setSelectedCategory("");
    setSelectedPart("");
    setPartsList([]);
    setCategories([]);
    setSubcategories([]);
    setMessage("");

    // Use the reusable helper
    const engineEntry = getEngineEntry(v);
    if (!engineEntry) {
      setMessage("No data found for this vehicle in the catalog.");
      return;
    }

    // Load categories
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

    setPartsList((prev) => [...prev,{ category: selectedCategory, part: selectedPart, quantity: 1 },]);
    setSelectedPart("");
    setMessage(`Added ${selectedPart} (${selectedCategory}) to list.`);
  }

  // Remove parts
  function handleRemovePart(index) {
    setPartsList((prev) => prev.filter((_, i) => i !== index));
  }

  // Generate report
  async function handleGenerate() {
    if (!selectedVehicle) {return setMessage("Please select a vehicle.");}
    if (partsList.length === 0) {return setMessage("Add at least one part before generating.");}
    if (generating) {return;}

    setGenerating(true);

    const tempId = `temp-${Date.now()}`;
    const tempReport = {_id: tempId, vehicle: selectedVehicle, title: `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model} (${partsList.length} parts)`, createdAt: new Date().toISOString(), isGenerating: true, progress: 0, total: partsList.length,};

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
              return (leaf === target || fam === target || leaf.includes(target) || target.includes(leaf));
            });
          }
        } catch (e) {
          console.error("[REPORT] /local fetch failed:", e);
        }

        // aggregate or mark out-of-stock
        if (matches.length >= 0) {
          const anyOutFlag = matches.some((m) => m.in_stock === false || m.in_stock === 0 || m.in_stock === "0" || m.in_stock === "false"|| m.price === null);

          // if all prices are 0 or missing, treat as out-of-stock
          const usable = matches.filter((m) => {
            const l = Number(m.low);
            const h = Number(m.high);
            const a = Number(m.avg);
            return (Number.isFinite(l) && l > 0) || (Number.isFinite(h) && h > 0) || (Number.isFinite(a) && a > 0);
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
          prev.map((r) =>r._id === tempId ? { ...r, progress: i + 1 } : r)
        );
      }

      // nothing found? remove the temp report
      if (foundCount === 0) {
        setReports((prev) => prev.filter((r) => r._id !== tempId));
        setMessage("No prices found for selected parts (nothing saved).");
        return;
      }

      // totals
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

      // save to backend
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

    // Wait for the report element to mount
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
      const logoImg = new Image();
      logoImg.src = logo;

      const brandImg = new Image();
      brandImg.src = brand;

      await Promise.all([logoImg.decode(), brandImg.decode()]);

      // PDF setup
      const pdf = new jsPDF("p", "pt", "a4");
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const margin = 40;

      // Header info
      const dateStr = new Date().toLocaleString();
      const reportTitle = `${r.vehicle?.year || ""} ${r.vehicle?.make || ""} ${
        r.vehicle?.model || ""
      } (${r.parts?.length || 0} parts)`;

      // Draw header
      pdf.addImage(logoImg, "PNG", margin, 30, 45, 45);
      pdf.addImage(brandImg, "PNG", margin + 50, 10, 110, 110);
      pdf.setFontSize(11);
      pdf.text(`Date: ${dateStr}`, pdfW - 170, 55);

      pdf.setFontSize(18);
      pdf.text("TrueRepairs Report", margin, 100);

      pdf.setFontSize(13);
      pdf.text(reportTitle, margin, 118);

      //  MULTI-SLICE CAPTURE SECTION
      const originalScrollTop = element.scrollTop;
      const totalHeight = element.scrollHeight;
      const viewportHeight = element.clientHeight;
      let currentY = 0;

      const usableTop = 140;

      while (currentY < totalHeight) {
        element.scrollTop = currentY;

        // Give the browser a moment
        await new Promise((res) => setTimeout(res, 120));

        const canvas = await html2canvas(element, {
          scale: 2,
          backgroundColor: "#ffffff",
          useCORS: true,
          scrollY: -window.scrollY,
        });

        const imgData = canvas.toDataURL("image/png");
        const imgW = pdfW - 2 * margin;
        const imgH = (canvas.height * imgW) / canvas.width;

        // New page for all slices except the first
        if (currentY > 0) pdf.addPage();

        pdf.addImage(imgData, "PNG", margin, usableTop, imgW, imgH);

        currentY += viewportHeight;
      }
      pdf.text("Source: RockAuto Online Parts Catalog", margin, pdfH - 20);
      element.scrollTop = originalScrollTop;

      // QUICK LINKS SECTION
      pdf.addPage();
      pdf.setFontSize(16);
      pdf.text("Quick Links", margin, 60);

      pdf.setFontSize(11);

      const linkMap = new Map();
      for (const p of r.parts || []) {
        const cleanName = (p.name || "").split("(")[0].trim();
        const { items } = findPartDetailsSmart(r.vehicle, p.category, cleanName);

        if (items && items.length && items[0].url) {
          const cat = p.category || cleanName;
          if (!linkMap.has(cat)) linkMap.set(cat, items[0].url);
        }
      }

      let linkY = 90;
      for (const [cat, url] of linkMap.entries()) {
        pdf.textWithLink(`• ${cat}`, margin, linkY, { url });
        linkY += 18;
      }

      // DETAILED BREAKDOWN (1 per part)
      pdf.addPage();
      pdf.setFontSize(16);
      pdf.text("Detailed Part Breakdown", margin, 60);

      for (let i = 0; i < (r.parts || []).length; i++) {
        const p = r.parts[i];
        if (i > 0) pdf.addPage();

        let y = 100;

        const cleanPart = (p.name || "").split("(")[0].trim();
        const { items: details, usedCategory } = findPartDetailsSmart(r.vehicle, p.category, cleanPart);

        const catLabel = usedCategory || p.category || "Unknown";

        pdf.setFontSize(14);
        pdf.text(`${catLabel} - ${p.name || ""}`, margin, y);

        y += 12;
        pdf.setDrawColor(200);
        pdf.line(margin, y, pdfW - margin, y);
        y += 20;

        pdf.setFontSize(11);

        if (details.length) {
          pdf.setFontSize(11);

          const colWidth = (pdfW - margin * 2) / 2;
          const col1X = margin;
          const col2X = margin + colWidth;

          let col1Y = y;
          let col2Y = y;

          let currentColumn = 1;

          for (const item of details) {
            // MEASURE TRUE HEIGHT
            const brandText = `Brand: ${item.brand ?? "N/A"}`;
            const partText = `Part #: ${item.partnumber ?? "N/A"}`;
            const descText = `Description: ${item.description ?? "N/A"}`;
            const priceText =`Price: ` + (item.price != null ? `$${Number(item.price).toFixed(2)}` : "N/A");
            const availText = `Availability: ${item.in_stock ? "In Stock" : "Out of Stock"}`;

            const brandH = pdf.getTextDimensions(brandText).h;
            const partH = pdf.getTextDimensions(partText).h;
            const descH = pdf.getTextDimensions(descText, { maxWidth: colWidth - 10 }).h;
            const priceH = pdf.getTextDimensions(priceText).h;
            const availH = pdf.getTextDimensions(availText).h;

            const blockHeight = brandH + partH + descH + priceH + availH + 28;

            // Choose the correct column
            let x = currentColumn === 1 ? col1X : col2X;
            let yPos = currentColumn === 1 ? col1Y : col2Y;

            // If doesn't fit in current column, switch or new page
            if (yPos + blockHeight > pdfH - 60) {
              if (currentColumn === 1) {
                currentColumn = 2;
                x = col2X;
                yPos = col2Y;
              } else {
                pdf.addPage();
                col1Y = 100;
                col2Y = 100;
                currentColumn = 1;
                x = col1X;
                yPos = col1Y;
              }
            }

            // Draw actual block
            pdf.text(brandText, x, yPos);
            yPos += brandH + 2;

            pdf.text(partText, x, yPos);
            yPos += partH + 2;

            pdf.text(descText, x, yPos, { maxWidth: colWidth - 10 });
            yPos += descH + 2;

            pdf.text(priceText, x, yPos);
            yPos += priceH + 2;

            pdf.text(availText, x, yPos);
            yPos += availH + 24;

            // Update column Y
            if (currentColumn === 1) {
              col1Y = yPos;
            } else {
              col2Y = yPos;
            }
          }

          // Move main Y to bottom of the taller column
          y = Math.max(col1Y, col2Y) + 20;
        }

        else {
          pdf.text("No detailed items found for this part.", margin, y);
        }
      }

      // Save
      pdf.save(`TrueRepairs_Report_${r.vehicle?.make || ""}_${r.vehicle?.model || ""}.pdf`);

      setMessage("PDF downloaded successfully.");
    } catch (err) {
      console.error("PDF generation failed:", err);
      setMessage("Failed to generate PDF.");
    }
  }

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
                <button className="reportgeneratebtn" onClick={handleGenerate}>Generate Report</button>
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

                              {/* Always render report div */}
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
                                        <td>{safe(p.low)}</td>
                                        <td>{safe(p.high)}</td>
                                        <td>{safe(p.avg)}</td>
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


// Robert Simovski
// Sources: 
// https://react.dev/reference/react/hooks
// https://developer.mozilla.org/en-US/docs/Web/API
// https://artskydj.github.io/jsPDF/docs/jsPDF.html
// https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements