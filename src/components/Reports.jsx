import React, { useState, useEffect} from "react";
import "../styles/Reports.css";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import vehicleData from "../data/toyotaFull.json";
import vehicleDataParts from "../../server/src/data/ToyotaParts.json";
import logo from "/logo.png";
import brand from "/TrueRepairs.png";
const API = "http://localhost:5000";

// Wrapper component. Report() will decide when the popup is open/close state.
// If open is true it mounts if it's false it returns null.
export default function Reports({ open, onClose }) {
  if (!open) return null;
  return <ReportsBody onClose={onClose} />;
}

// Core logic
function ReportsBody({ onClose }) {
  // Safe formatting helper that will clean up nulls, zeros, and non-numeric strings
  // before displaying in the report table.
  const safe = (val) => {
    if (val === null || val === undefined || val === "") return "-";
    // RockAuto sometimes gives numeric "0" which means unavailable
    if (val === 0 || val === "0") return "Out of Stock";
    // If string but not numeric, return it directly
    if (typeof val === "string" && isNaN(Number(val))) return val;
    // Otherwise numeric formatting
    return Number(val).toFixed(2);
  };

  // User + Stete
  // Loads the logged-in user from localStorage.
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

  /* Load user's vehicles
  EFFECT: LOAD USER VEHICLES
    What it does:
    - Calls backend GET /api/vehicles
    - Stores all vehicles tied to the user.
    - These populate the dropdown on the left side.
  */
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

  /* Load user's reports
  EFFECT: LOAD USER REPORTS
    What it does:
    - Calls backend GET /api/reports?email
    - Stores the user’s existing reports (these show on the right-hand side)
  */
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

  // This function searches through the vehicleData (toyotaFull.json) to find the **exact engine node** for the selected vehicle.
  function getEngineEntry(vehicle, data = vehicleData) {
    // Checks if a vehicle is selected if not will return null
    if (!vehicle) return null;

    // Will find the correct year entry from the JSON data
    const yearEntry = data.find((y) => y.year === Number(vehicle.year));
    if (!yearEntry) return null;

    // After they find the year finds the model within that year
    const modelEntry = yearEntry.models.find(
      (m) => m.model.toUpperCase() === String(vehicle.model).toUpperCase()
    );
    if (!modelEntry) return null;

    // Once the year and model are found it finds the engine within that model
    const engineEntry = modelEntry.engines.find(
      (en) => en.engine.toUpperCase() === String(vehicle.engine).toUpperCase()
    );

    // returns the engine entry or null if not found
    return engineEntry || null;
  }

  // Called when the user selects a different vehicle from the dropdown.
  async function handleVehicleChange(e) {
    // Get selected vehicle ID
    const vehicleId = e.target.value;

    // searches and find the vehicle object from the vehicles state
    const v = vehicles.find((veh) => veh._id === vehicleId);
    if (!v) return;

    // Reset every UI-dependent state when vehicle changes
    setSelectedVehicle(v);
    setSelectedCategory("");
    setSelectedPart("");
    setPartsList([]);
    setCategories([]);
    setSubcategories([]);
    setMessage("");

    // Use helper to locate proper engine node from the JSON
    const engineEntry = getEngineEntry(v);
    if (!engineEntry) {
      setMessage("No data found for this vehicle in the catalog.");
      return;
    }

    // Extract categories like "Brakes", "Suspension", "Body", etc.
    const categoryNames = engineEntry.categories.map((c) => c.category);

    // Update state with found categories
    setCategories(categoryNames);
    setMessage(`Loaded ${categoryNames.length} categories.`);
  }

  // When the user selects a category (Area of Car), this function loads the available PART TYPES under that category.
  function handleCategoryChange(e) {
    // Get selected category
    const newCategory = e.target.value;

    // Update state and reset dependent states
    setSelectedCategory(newCategory);
    setSelectedPart("");

    // You can't load subcategories if no vehicle selected
    if (!selectedVehicle || !newCategory) return;

    // Extract year, model, engine from selected vehicle
    const { year, model, engine } = selectedVehicle;

    // Navigate through full JSON to reach the correct category
    const yearEntry = vehicleData.find((y) => y.year === Number(year));
    const modelEntry = yearEntry?.models.find((m) => m.model.toUpperCase() === String(model).toUpperCase());
    const engineEntry = modelEntry?.engines.find((en) => en.engine.toUpperCase() === String(engine).toUpperCase());
    const categoryEntry = engineEntry?.categories.find((c) => c.category === newCategory);

    // If found, extract part types and update state
    if (categoryEntry) {
      // Convert part types into objects with name property for easier handling
      setSubcategories(categoryEntry.parttypes.map((p) => ({ name: p })));
      setMessage(`Loaded ${categoryEntry.parttypes.length} parts.`);
    } else {
      // No parts found for this category
      setSubcategories([]);
      setMessage("No parts found for this category.");
    }
  }

  // Adds the currently selected part into the partsList array.
  function handleAddPart() {
    // You can't add unless both category AND part are selected
    if (!selectedCategory || !selectedPart) return;

    // prevent duplicates part entries in the list 
    const exists = partsList.some((p) => p.category === selectedCategory && p.part === selectedPart);
    if (exists) return setMessage("That part is already in the list.");

    // add new poart to the list with default quantity of 1
    setPartsList((prev) => [...prev,{ category: selectedCategory, part: selectedPart, quantity: 1 },]);
    // reset selected part
    setSelectedPart("");
    setMessage(`Added ${selectedPart} (${selectedCategory}) to list.`);
  }

  // Removes a specific part from the partsList.
  function handleRemovePart(index) {
    // filter out the part at the given index
    setPartsList((prev) => prev.filter((_, i) => i !== index));
  }

  // Main Generate report system
  async function handleGenerate() {
    // validation checks for vehicle and parts
    if (!selectedVehicle) {return setMessage("Please select a vehicle.");}
    if (partsList.length === 0) {return setMessage("Add at least one part before generating.");}
    
    // prevent multiple simultaneous generations
    if (generating) {return;}

    // start generation
    setGenerating(true);

    // create a temporary report object to show progress
    const tempId = `temp-${Date.now()}`;
    const tempReport = {_id: tempId, vehicle: selectedVehicle, title: `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model} (${partsList.length} parts)`, createdAt: new Date().toISOString(), isGenerating: true, progress: 0, total: partsList.length,};

    // Prepend this temp report to the list so UI shows progress bar
    setReports((prev) => [tempReport, ...prev]);
    setMessage(`Generating report for ${selectedVehicle.make} ${selectedVehicle.model}...`);

    // Will store per-part summaries here
    const partSummaries = [];
    // Count of parts with at least some pricing found
    let foundCount = 0;

    try {
      // Part lookup loop for selected parts
      for (let i = 0; i < partsList.length; i++) {
        const item = partsList[i];
        const qty = Math.max(1, Number(item.quantity) || 1);

        // Build query string (year, model, engine, parttype)
        const qs = new URLSearchParams({
          year: String(selectedVehicle.year || ""),
          model: String(selectedVehicle.model || ""),
          engine: String(selectedVehicle.engine || ""),
          parttype: String(item.part || ""),
        }).toString();

        // Fetch matching parts from backend
        let matches = [];

        // Try fetching local pricing data
        try {
          // Fetch from backend
          const res = await fetch(`${API}/api/reports/local?${qs}`);
          // If successful, filter results to find relevant matches
          if (res.ok) {
            const data = await res.json();
            const target = String(item.part || "").toUpperCase();
            // filter matches by parttype or category matching the requested part
            matches = (data?.parts || []).filter((p) => {
              // special handling for matching
              const leaf = String(p.parttype || "").toUpperCase();
              // broader category match
              const fam = String(p.category || "").toUpperCase();
              // match exact or includes both ways
              return (leaf === target || fam === target || leaf.includes(target) || target.includes(leaf));
            });
          }
        } catch (e) {
          console.error("[REPORT] /local fetch failed:", e);
        }

        // aggregate or mark out-of-stock
        if (matches.length >= 0) {
          // check if any match is out-of-stock or price missing
          const anyOutFlag = matches.some((m) => m.in_stock === false || m.in_stock === 0 || m.in_stock === "0" || m.in_stock === "false"|| m.price === null);

          // if all prices are 0 or missing, treat as out-of-stock
          const usable = matches.filter((m) => {
            const l = Number(m.low);
            const h = Number(m.high);
            const a = Number(m.avg);
            return (Number.isFinite(l) && l > 0) || (Number.isFinite(h) && h > 0) || (Number.isFinite(a) && a > 0);
          });

          // If any are out-of-stock, or no usable prices, mark whole part as out-of-stock
          if (anyOutFlag || usable.length === 0) {
            partSummaries.push({
              name: `${item.part} (x${qty})`,
              category: item.category,
              low: "Out of Stock",
              high: "Out of Stock",
              avg: "Out of Stock",
            });
          } else {
            // Aggregate prices from usable matches
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

            // If all 0 treat as out of stock
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

      // nothing found remove the temp report
      if (foundCount === 0) {
        // remove temp report
        setReports((prev) => prev.filter((r) => r._id !== tempId));
        setMessage("No prices found for selected parts (nothing saved).");
        return;
      }

      // Compute totals for entire report
      const totals = partSummaries.reduce(
        (acc, p) => {
          // low/high/avg if numeric
          if (typeof p.low === "number") acc.low += p.low;
          if (typeof p.high === "number") acc.high += p.high;
          if (typeof p.avg === "number") acc.avg += p.avg;
          return acc;
        },
        // initial accumulator
        { low: 0, high: 0, avg: 0 }
      );

      // final summary object to 2 decimal places
      const summary = {
        totalLow: Number(totals.low.toFixed(2)),
        totalHigh: Number(totals.high.toFixed(2)),
        totalAvg: Number(totals.avg.toFixed(2)),
      };

      // Prepare payload for backend save
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

      // Saves the report to the backend
      const response = await fetch(`${API}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saveBody),
      });

      // fetch error handling
      if (!response.ok) throw new Error("Failed to save report");
      const savedReport = await response.json();

      // Replace temp with final persisted report
      setReports((prev) => {
        // filter out the temporary report
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

        // prepend to list and return
        return [finished, ...withoutTemp];
      });

      // final success message
      setMessage("Report saved!");
    } catch (e) {
      // error handling
      console.error("[REPORT] save report error:", e);
      setMessage("Report generated, but failed to save.");
    } finally {
      // reset generation state
      setGenerating(false);
      setPartsList([]);
    }

    // Refresh reports from backend after save
    const updated = await fetch(`${API}/api/reports?email=${encodeURIComponent(userEmail)}`);
    const freshData = await updated.json();
    setReports(freshData.items || freshData.reports || []);

  }

  // This is your intelligent lookup engine that finds detailed part data inside ToyotaParts.json.
  function findPartDetailsSmart(vehicle, preferredCategory, partName, data = vehicleDataParts) {
    // Normalization helper for case/format insensitive matching
    const norm = (s) => String(s ?? "") .toUpperCase() .replace(/&/g, "AND") .replace(/[^A-Z0-9]+/g, " ") .replace(/\s+/g, " ") .trim();
    // Case-insensitive key finder with includes matching
    const findKeyCI = (obj, target) => {
      // safety check when obj or target missing
      if (!obj || !target) return null;
      const want = norm(target);

      // Exact category/part match
      for (const k of Object.keys(obj)) {
        if (norm(k) === want) return k;
      }

      // Includes match both ways 
      for (const k of Object.keys(obj)) {
        const nk = norm(k);
        if (nk.includes(want) || want.includes(nk)) return k;
      }

      return null;
    };

    // object vs array schema support
    const pickBucket = (node) => node?.parttypes ?? node?.partTypes ?? node;

    // if there is no data, return empty
    if (!data) {
      return { items: [], usedCategory: null, usedPartKey: null };
    }

    // Get the correct engine node from the JSON
    const getEngineNode = () => {
      // New array-based format
      if (Array.isArray(data)) {
        // Navigate year > model > engine
        const yearEntry =
          data.find((y) => String(y.year) === String(vehicle.year)) ??
          data.find((y) => norm(y.year) === norm(vehicle.year));
        if (!yearEntry) return null;

        // Find model with exact or includes match
        const modelEntry =
          yearEntry.models.find((m) => norm(m.model) === norm(vehicle.model)) ??
          yearEntry.models.find((m) => norm(m.model).includes(norm(vehicle.model)));
        if (!modelEntry) return null;

        // Find engine with exact or includes match
        const engineEntry =
          modelEntry.engines.find((e) => norm(e.engine) === norm(vehicle.engine)) ??
          modelEntry.engines.find((e) => norm(e.engine).includes(norm(vehicle.engine)));
        if (!engineEntry) return null;

        return engineEntry;
      }

      // OLD OBJECT TREE SCHEMA
      const yearKey = data[String(vehicle.year)] != null ? String(vehicle.year) : findKeyCI(data, vehicle.year);
      if (!yearKey) return null;

      // Navigate year > model > engine
      const yearNode = data[yearKey];
      const modelKey = findKeyCI(yearNode, vehicle.model);
      if (!modelKey) return null;

      // Get model node
      const modelNode = yearNode[modelKey];
      const engineKey = findKeyCI(modelNode, vehicle.engine);
      if (!engineKey) return null;

      return modelNode[engineKey];
    };

    // Attempt engine lookup
    const engineNode = getEngineNode();
    if (!engineNode) {
      // no engine found
      return { items: [], usedCategory: null, usedPartKey: null };
    }

    // Categories can be nested under engine.categories OR directly in engine
    const catsNode = engineNode.categories ?? engineNode;
    if (!catsNode || typeof catsNode !== "object") {
      // no categories found
      return { items: [], usedCategory: null, usedPartKey: null };
    }

    // Get all category keys and order them intelligently
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
      // get the parttypes bucket
      const bucket = pickBucket(catNode);
      if (!bucket || typeof bucket !== "object") continue;

      // Try to find matching part key inside the bucket
      const partKey = findKeyCI(bucket, partName);
      const matches = partKey ? bucket[partKey] : null;

       // If match with detailed entries found > return it
      if (Array.isArray(matches) && matches.length > 0) {
        return { items: matches, usedCategory: ck, usedPartKey: partKey };
      }
    }

    // Nothing found, return fallback result
    return { items: [], usedCategory: orderedCats[0] ?? null, usedPartKey: null };
  }

  // Download report PDF Generation
  async function handleDownload(r) {
    // Set expanded to ensure the report element is mounted
    setExpanded(r._id);

    // Wait for the report element to mount
    let element = null;

    // Try up to 2 seconds to find the element
    for (let i = 0; i < 40; i++) {
      element = document.getElementById(`report-${r._id}`);
      if (element) break;
      await new Promise((res) => setTimeout(res, 50));
    }

    // If still not found, show error
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

      // Wait for images to load
      await Promise.all([logoImg.decode(), brandImg.decode()]);

      // Create jsPDF instance
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

      // Loop to capture full element in slices
      while (currentY < totalHeight) {
        element.scrollTop = currentY;

        // Give the browser a moment
        await new Promise((res) => setTimeout(res, 120));

        // Capture current viewport slice
        const canvas = await html2canvas(element, {
          scale: 2,
          backgroundColor: "#ffffff",
          useCORS: true,
          scrollY: -window.scrollY,
        });
        
        // Calculate image dimensions for PDF
        const imgData = canvas.toDataURL("image/png");
        const imgW = pdfW - 2 * margin;
        const imgH = (canvas.height * imgW) / canvas.width;

        // New page for all slices except the first
        if (currentY > 0) pdf.addPage();

        // Draw the image slice onto the PDF
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

      // Build unique category links
      const linkMap = new Map();
      // Iterate parts to find URLs
      for (const p of r.parts || []) {
        const cleanName = (p.name || "").split("(")[0].trim();
        const { items } = findPartDetailsSmart(r.vehicle, p.category, cleanName);
        // If found, add to map
        if (items && items.length && items[0].url) {
          const cat = p.category || cleanName;
          if (!linkMap.has(cat)) linkMap.set(cat, items[0].url);
        }
      }

      let linkY = 90;
      // Draw each link
      for (const [cat, url] of linkMap.entries()) {
        pdf.textWithLink(`• ${cat}`, margin, linkY, { url });
        linkY += 18;
      }

      // DETAILED BREAKDOWN (1 per part)
      pdf.addPage();
      pdf.setFontSize(16);
      pdf.text("Detailed Part Breakdown", margin, 60);

      // Loop through each part for detailed info
      for (let i = 0; i < (r.parts || []).length; i++) {
        const p = r.parts[i];
        // New page per part except first
        if (i > 0) pdf.addPage();

        let y = 100;
        // Find detailed part info
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

        // If details found, render them
        if (details.length) {
          pdf.setFontSize(11);

          // Column setup
          const colWidth = (pdfW - margin * 2) / 2;
          const col1X = margin;
          const col2X = margin + colWidth;

          // Initialize column positions
          let col1Y = y;
          let col2Y = y;
          let currentColumn = 1;

          // Loop through each detailed item
          for (const item of details) {
            // Prepare text lines
            const brandText = `Brand: ${item.brand ?? "N/A"}`;
            const partText = `Part #: ${item.partnumber ?? "N/A"}`;
            const descText = `Description: ${item.description ?? "N/A"}`;
            const priceText =`Price: ` + (item.price != null ? `$${Number(item.price).toFixed(2)}` : "N/A");
            const availText = `Availability: ${item.in_stock ? "In Stock" : "Out of Stock"}`;

            // Calculate block height
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

      // Save PDF
      pdf.save(`TrueRepairs_Report_${r.vehicle?.make || ""}_${r.vehicle?.model || ""}.pdf`);

      setMessage("PDF downloaded successfully.");
    } catch (err) {
      console.error("PDF generation failed:", err);
      setMessage("Failed to generate PDF.");
    }
  }

  // Delete a report by ID
  async function handleDeleteReport(id) {
    try {
      // Send delete request to backend
      const res = await fetch(`${API}/api/reports/${id}`, { method: "DELETE" });

      // Check for errors
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
          {/* TITLE */}
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
                      <p><strong>Trim:</strong> {selectedVehicle.trim || "N/A"}</p>
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