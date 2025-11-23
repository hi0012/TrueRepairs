import { useEffect, useState } from "react";
import "../styles/AIScanModal.css";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function AIScanModal({ open, onClose, userEmail }) {
  const [vehicles, setVehicles] = useState([]);
  const [laborRate, setLaborRate] = useState(110);
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [previews, setPreviews] = useState([]);
  const [msg, setMsg] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  // FULLSCREEN IMAGE VIEWER
  const [fullImage, setFullImage] = useState(null);

  // LOAD HISTORY WHEN MODAL OPENS
  useEffect(() => {
    if (open) {
      setMsg("");
      setResult(null);
      setFiles([]);
      loadHistory();
    }
  }, [open]);
  
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


  const handleClose = () => {
    if (!submitting && onClose) onClose();
  };

  const handleVehicleChange = (e) => {
    const vehicleId = e.target.value;
    const vehicle = vehicles.find((v) => v._id === vehicleId) || null;
    setSelectedVehicle(vehicle);
  }
  
  async function loadHistory() {
    if (!userEmail) return;

    try {
      const res = await fetch(`${API}/api/estimates?email=${encodeURIComponent(userEmail)}`);
      const j = await res.json();
      setHistory(Array.isArray(j.items) ? j.items : []);
    } catch (err) {
      console.error("Failed to load history", err);
    }
  }

  // SUBMIT IMAGES
  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");

    if (!userEmail || !files.length) {
      setMsg("Email and at least one image are required.");
      return;
    }

    if (!selectedVehicle) {
      setMsg("Please select a vehicle first.");
      setSubmitting(false);
      return;
    }

    setSubmitting(true);

    try {
      const fd = new FormData();
      fd.append("email", userEmail);
      fd.append("laborRate", laborRate);

      fd.append("year", selectedVehicle.year);
      fd.append("make", selectedVehicle.make);
      fd.append("model", selectedVehicle.model);
      fd.append("trim", selectedVehicle.trim || "");
      fd.append("engine", selectedVehicle.engine);

      files.forEach((f) => fd.append("files", f));

      const res = await fetch(`${API}/api/estimate`, {method: "POST", body: fd,});

      const j = await res.json();
      if (!res.ok) throw new Error(j.message || "AI estimate failed.");

      setResult(j);
      await loadHistory();
      setFiles([]);
      setPreviews([]);
    } catch (err) {
      console.error("Upload/estimate error", err);
      setMsg(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  // DELETE
  async function handleDelete(id) {
    if (!id) return;

    // INSTANT UI REMOVE (no waiting)
    setHistory((prev) => prev.filter((h) => h._id !== id));
    if (result && result._id === id) setResult(null);

    // Send delete in background
    fetch(`${API}/api/estimates/${id}`, { method: "DELETE" })
      .catch((err) => console.error("Delete error:", err));
  }

  // DOWNLOAD REPORT
  async function handleDownload(est) {
    try {
      // Expand report before rendering
      if (expanded !== est._id) {
        setExpanded(est._id);
        await new Promise((resolve) => setTimeout(resolve, 150));
      }

      const element = document.getElementById(`aiscan-report-${est._id}`);
      if (!element) {
        setMsg("Failed: Report not found in DOM.");
        return;
      }

      // Page 1 Screenshot
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: "#fff",
        useCORS: true,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "pt", "a4");

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgProps = pdf.getImageProperties(imgData);
      const ratio = Math.min(
        (pageWidth - 40) / imgProps.width,
        (pageHeight - 120) / imgProps.height
      );

      const imgWidth = imgProps.width * ratio;
      const imgHeight = imgProps.height * ratio;

      pdf.addImage(imgData, "PNG", (pageWidth - imgWidth) / 2, 60, imgWidth, imgHeight);

      // Page 2 — Parts Breakdown
      pdf.addPage();

      const margin = 40;
      let y = 60;

      pdf.setFontSize(18);
      pdf.text("Parts Breakdown", margin, y);

      y += 30;
      pdf.setFontSize(11);

      // Table header
      const headers = ["Part", "Op", "Severity", "Part Cost", "Paint", "Total"];
      const colWidths = [140, 60, 60, 70, 60, 70];
      const startX = margin;

      headers.forEach((h, i) => {
        const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
        pdf.text(h, x, y);
      });

      y += 12;
      pdf.setDrawColor(150);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 16;

      let totalParts = 0;
      let totalPaint = 0;

      (est.parts || []).forEach((p) => {
        const partTotal = Number(p.cost) + Number(p.paintCost);
        totalParts += Number(p.cost);
        totalPaint += Number(p.paintCost);

        const row = [
          p.name,
          p.operation,
          p.severity,
          `$${Number(p.cost).toFixed(2)}`,
          p.paintCost > 0 ? `$${p.paintCost}` : "$0",
          `$${partTotal.toFixed(2)}`
        ];

        row.forEach((value, i) => {
          const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
          pdf.text(String(value), x, y);
        });

        y += 18;

        // INFO URL
        if (p.info_url) {
          pdf.setTextColor(0, 0, 255);
          pdf.setFontSize(9);
          pdf.textWithLink("More Info", startX, y, { url: p.info_url });
          pdf.setTextColor(0, 0, 0);
          pdf.setFontSize(11);
          y += 14;
        }

        if (y > pageHeight - 60) {
          pdf.addPage();
          y = 60;
        }
      });

      // Totals Section
      y += 10;
      pdf.setFontSize(13);
      pdf.text(`Parts Total: $${totalParts.toFixed(2)}`, margin, y);
      y += 20;
      pdf.text(`Paint Total: $${totalPaint.toFixed(2)}`, margin, y);

      y += 20;
      pdf.text(`Labor (${est.breakdown.laborHours} hrs @ $${est.breakdown.laborRate}/hr): $${(est.breakdown.laborHours * est.breakdown.laborRate).toFixed(2)}`, margin, y);

      y += 20;
      pdf.text(`Misc: $${est.breakdown.misc}`, margin, y);

      y += 25;
      pdf.setFontSize(16);
      pdf.text(`Grand Total: $${est.totalEstimated.toFixed(2)}`, margin, y);

      pdf.save(`AI_Estimate_${est._id}.pdf`);
      setMsg("PDF downloaded.");
    } catch (err) {
      console.error("PDF error", err);
      setMsg("Failed to generate PDF.");
    }
  }

  if (!open) return null;

  // DAMAGE LIST RENDER
  const renderDamages = (damages) => {
    if (!Array.isArray(damages) || !damages.length) return null;

    return (
      <>
        <h4>Detected Damages</h4>
        <ul className="aiscan-damages-list">
          {damages.map((d, i) => (
            <li key={i} className="aiscan-damage-item">
              <div>
                <strong>{d.part || "Unknown part"}</strong>{" "}
                <span>({d.operation || "Operation unknown"})</span>
              </div>

              <div className="aiscan-damage-meta">
                {d.worstSeverity && <span>Severity: {d.worstSeverity}</span>}
                {d.maxConfidence && (
                  <span> · Accuracy: {Math.round(d.maxConfidence * 100)}%</span>
                )}
                {Array.isArray(d.sources) && d.sources.length > 0 && (
                  <span> · Source images: {d.sources.map((s) => s + 1).join(", ")}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </>
    );
  };

  function removePreview(index) {
    setPreviews((prev) => prev.filter((item, i) => i !== index));
    setFiles((prev) => prev.filter((item, i) => i !== index));
  }

  // BREAKDOWN TABLE
  const renderBreakdown = (breakdown) => {
    if (!breakdown) return null;

    if (!Array.isArray(breakdown)) {
      const laborHours = breakdown.laborHours ?? breakdown.totalLaborHours;
      const partsTotal = breakdown.parts ?? breakdown.partsTotal;

      return (
        <div className="aiscan-breakdown">
          <h4>Breakdown</h4>
          <table className="aiscan-breakdown-table">
            <tbody>
              {laborHours && (
                <tr>
                  <td>Labor Hours</td>
                  <td>{laborHours}</td>
                </tr>
              )}

              {laborHours && (
                <tr>
                  <td>Labor Cost</td>
                  <td>${(laborHours * laborRate).toFixed(2)}</td>
                </tr>
              )}

              {partsTotal && (
                <tr>
                  <td>Parts</td>
                  <td>${partsTotal.toFixed(2)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      );
    }
    return (
      <div className="aiscan-breakdown">
        <h4>Breakdown</h4>
        <table className="aiscan-breakdown-table">
          <thead>
            <tr>
              <th>Part</th>
              <th>Operation</th>
              <th>Hours</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.map((b, i) => (
              <tr key={i}>
                <td>{b.part}</td>
                <td>{b.operation}</td>
                <td>{b.hours ?? "—"}</td>
                <td>{b.total ? `$${b.total}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // ESTIMATE PANEL
  const renderEstimatePanel = (data, isHistory) => {
    if (!data) return null;
    const vehicle = data.vehicle || {};
    const id = isHistory ? `aiscan-report-${data._id}` : "aiscan-report";

    return (
      <div id={id} className="aiscan-report">
        {vehicle.label && (
          <p className="aiscan-vehicle-line">
            <strong>Vehicle:</strong> {vehicle.label}
            {vehicle.confidence && (
              <span> · {Math.round(vehicle.confidence * 100)}% accuracy</span>
            )}
          </p>
        )}

        {renderDamages(data.damages)}
        {renderBreakdown(data.breakdown)}

        {data.totalEstimated && (
          <p className="aiscan-total">
            <strong>Total:</strong> ${data.totalEstimated.toFixed(2)}
          </p>
        )}
      </div>
    );
  };

  //IMAGE GRID + FULLSCREEN CLICK
  const renderImages = (images) => {
    if (!Array.isArray(images) || images.length === 0) return null;

    const total = images.length;
    const current = carouselIndex % total;

    const src =
      images[current].imageUrl ||
      images[current].thumbUrl ||
      images[current].secure_url ||
      images[current].url ||
      images[current].path ||
      images[current];

    return (
      <div className="aiscan-carousel">
        <h4>Uploaded Photos</h4>

        <div className="carousel-container">
          <button className="carousel-arrow left" onClick={(e) => {e.stopPropagation(); setCarouselIndex((prev) => (prev - 1 + total) % total);}}>
            ←
          </button>

          <img src={src} alt="vehicle" className="carousel-image" onClick={() => setFullImage(src)}/>

          <button className="carousel-arrow right" onClick={(e) => { e.stopPropagation(); setCarouselIndex((prev) => (prev + 1) % total);}}>
            →
          </button>
        </div>

        <p className="carousel-index">
          {current + 1} / {total}
        </p>
      </div>
    );
  };


  return (
    <div className="aiscan-modal-overlay">
      <div className="aiscan-modal">
        <div className="aiscan-modal-header">
          <h1>AI Damage Estimate</h1>
          <p>Generate and save AI-powered damage assessments.</p>
        </div>

        <div className="aiscan-modal-body">
          {/* LEFT COLUMN */}
          <div className="aiscan-left-column">
            <form className="aiscan-form" onSubmit={handleSubmit}>
              {/* Vehicle select */}

              <div className="reportselectfield">
                <label>Select Vehicle:</label>
                <select value={selectedVehicle?._id || ""} onChange={handleVehicleChange}>
                  <option value="">Select Vehicle</option>
                  {vehicles.map((v) => (
                    <option key={v._id} value={v._id}>
                      {v.year} {v.make} {v.model}
                    </option>
                  ))}
                </select>
              </div>
              <div className="aiscan-form-row">
                <label>
                  Labor Rate ($/hr)
                  <input type="number" min="0" value={laborRate} onChange={(e) => setLaborRate(Number(e.target.value))}/>
                </label>
              </div>

              <div className="aiscan-form-row">
                <label>
                  Photos
                  <input type="file" accept="image/*" multiple onChange={(e) => {
                    const selected = Array.from(e.target.files || []);
                    setFiles(selected);

                    const urls = selected.map((file) => URL.createObjectURL(file));
                    setPreviews(urls);
                  }}/>

                  {previews.length > 0 && (
                    <div className="preview-grid">
                      {previews.map((src, idx) => (
                        <div key={idx} className="preview-item">
                          <img src={src} alt="preview" className="preview-thumb" />

                          <button className="preview-delete" onClick={(e) => {e.stopPropagation(); e.preventDefault();  removePreview(idx);}}>
                            X
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </label>
              </div>

              {msg && <div className="aiscan-message">{msg}</div>}

              <button type="submit" className="aiscan-submit-btn" disabled={submitting}>
                {submitting ? "Processing..." : "Upload & Estimate"}
              </button>
            </form>

            {result && (
              <div className="aiscan-current-result">
                <h3>Latest Estimate</h3>
                {renderEstimatePanel(result, false)}
                {renderImages(result.images)}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN — HISTORY */}
          <div className="aiscan-history-column">
            <div className="aiscan-history">
              <h3>Previous Estimates</h3>

              {history.length === 0 && (
                <p className="aiscan-history-empty">
                  No previous AI estimates found.
                </p>
              )}

              {history.map((est) => (
                <div key={est._id} className="aiscan-history-item">
                  <div className="aiscan-history-header">
                    <div className="RepItemHeader">
                      <strong>{new Date(est.createdAt).toLocaleString()}</strong>

                      <div className="RepActions">
                        <button className="RepViewBtn" onClick={() => setExpanded(expanded === est._id ? null : est._id)}>
                          {expanded === est._id ? "Hide" : "View"}
                        </button>

                        <button className="RepDownloadBtn" onClick={() => handleDownload(est)}>
                          Download
                        </button>

                        <button className="RepDeleteBtn" onClick={() => handleDelete(est._id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>

                  {expanded === est._id && (
                    <div className="RepDropdown visible">
                      {renderEstimatePanel(est, true)}
                      {renderImages(est.images)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="aiscan-modal-footer">
          <button className="aiscan-cancel-btn" onClick={handleClose}>
            Cancel
          </button>
        </div>
      </div>

      {/* FULLSCREEN VIEWER */}
      {fullImage && (
        <div className="aiscan-img-viewer" onClick={() => setFullImage(null)}>
          <img src={fullImage} alt="Full View" />
        </div>
      )}
    </div>
  );
}
