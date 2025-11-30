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
      if (!open || !userEmail) return;

      (async () => {
          try {
              const res = await fetch(`${API}/api/vehicles?email=${userEmail}`);
              const data = await res.json();
              setVehicles(data.items || []);
          } catch (e) {
              console.error("Vehicle fetch error:", e);
          }
      })();
  }, [open, userEmail]);

  const handleClose = () => {
    if (submitting) return;

    setExpanded(null);
    setSelectedVehicle(null);
    setFiles([]);
    setPreviews([]);
    setResult(null);
    setMsg("");
    setCarouselIndex(0);

    if (onClose) onClose();
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

      const pdf = new jsPDF("p", "pt", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 40;

      const logoImg = new Image();
      logoImg.src = "/logo.png";

      const brandImg = new Image();
      brandImg.src = "/TrueRepairs.png";

      await Promise.all([logoImg.decode(), brandImg.decode()]);

      const dateStr = new Date().toLocaleString();

      const logoY = 30;
      // Logos
      pdf.addImage(logoImg, "PNG", margin, logoY, 45, 45);
      pdf.addImage(brandImg, "PNG", margin + 45, logoY - 20, 100, 100);

      // Date
      pdf.setFontSize(11);
      pdf.text(`Date: ${dateStr}`, pdfWidth - 170, 50);

      // Title
      pdf.setFontSize(18);
      pdf.text("TrueRepairs Damage Report", margin, 110);

      // Vehicle line
      pdf.setFontSize(13);
      pdf.text(`${est.vehicle?.year || ""} ${est.vehicle?.make || ""} ${est.vehicle?.model || ""}`, margin,130);

      const canvas = await html2canvas(element, {scale: 2, backgroundColor: "#fff", useCORS: true,});
      const imgData = canvas.toDataURL("image/png");

      const imgProps = pdf.getImageProperties(imgData);
      const ratio = Math.min((pdfWidth - 40) / imgProps.width, (pdfHeight - 180) / imgProps.height);

      const imgWidth = imgProps.width * ratio;
      const imgHeight = imgProps.height * ratio;

      pdf.addImage(imgData, "PNG", (pdfWidth - imgWidth) / 2, 150, imgWidth, imgHeight);
      pdf.addPage();
      let y = 60;

      pdf.setFontSize(18);
      pdf.text("Parts Breakdown", margin, y);

      y += 30;
      pdf.setFontSize(11);

      const headers = ["Part", "Op", "Severity", "Part Cost", "Paint", "Total"];
      const colWidths = [140, 60, 60, 70, 60, 70];
      const startX = margin;

      headers.forEach((h, i) => {
        const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
        pdf.text(h, x, y);
      });

      y += 12;
      pdf.setDrawColor(150);
      pdf.line(margin, y, pdfWidth - margin, y);
      y += 16;

      let totalParts = 0;
      let totalPaint = 0;

      (est.parts || []).forEach((p) => {
        const partCost = Number(p.cost || 0);
        const paintCost = Number(p.paintCost || 0);
        const total = partCost + paintCost;

        totalParts += partCost;
        totalPaint += paintCost;

        const row = [p.name || "Unknown", p.operation || "replace", p.severity || "unknown", `$${partCost.toFixed(2)}`, `$${paintCost.toFixed(2)}`, `$${total.toFixed(2)}`];

        row.forEach((value, index) => {
          const x = startX + colWidths.slice(0, index).reduce((a, b) => a + b, 0);
          pdf.text(String(value), x, y);
        });

        y += 18;

        if (p.info_url) {
          pdf.setTextColor(0, 0, 255);
          pdf.setFontSize(9);
          pdf.textWithLink("More Info", startX, y, { url: p.info_url });
          pdf.setTextColor(0, 0, 0);
          pdf.setFontSize(11);
          y += 14;
        }

        if (y > pdfHeight - 60) {
          pdf.addPage();
          y = 60;
        }
      });

      // Totals
      y += 10;
      pdf.setFontSize(13);
      pdf.text(`Parts Total: $${totalParts.toFixed(2)}`, margin, y);
      y += 20;
      pdf.text(`Paint Total: $${totalPaint.toFixed(2)}`, margin, y);

      const laborTotal = est.breakdown.laborHours * est.breakdown.laborRate;
      y += 20;
      pdf.text(`Labor (${est.breakdown.laborHours} hrs @ $${est.breakdown.laborRate}/hr): $${laborTotal.toFixed(2)}`, margin, y);

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

  // ESTIMATE PANEL
  const renderEstimatePanel = (data, isHistory) => {
    if (!data) return null;

    const vehicle = data.vehicle || {};
    const id = isHistory ? `aiscan-report-${data._id}` : "aiscan-report";

    const vehicleTitle = `${vehicle.year || ""} ${vehicle.make || ""} ${vehicle.model || ""} (${(data.parts || []).length} parts)`;
    const created = data.createdAt ? new Date(data.createdAt).toLocaleString() : "Unknown Date";

    return (
      <div id={id} className="aiscan-report">
        <p className="aiscan-vehicle-line">
          <strong>{vehicleTitle}</strong>
          <br />
        </p>

        {vehicle.label && (
          <p className="aiscan-vehicle-sub">
            <strong>Detected:</strong> {vehicle.label}
            {vehicle.confidence && (
              <span> · {Math.round(vehicle.confidence * 100)}% accuracy</span>
            )}
          </p>
        )}

        {renderDamages(data.damages)}

        <div className="aiscan-breakdown">
          <h4>Breakdown</h4>
          <table className="aiscan-breakdown-table">
            <tbody>

              {/* Labor */}
              <tr>
                <td>Labor Hours</td>
                <td>{data.breakdown?.laborHours || 0}</td>
              </tr>

              <tr>
                <td>Labor Cost</td>
                <td>${(data.breakdown?.laborHours * data.breakdown?.laborRate).toFixed(2)}</td>
              </tr>

              {/* Parts total */}
              <tr>
                <td>Parts</td>
                <td>${(data.breakdown?.parts || 0).toFixed(2)}</td>
              </tr>

              {/* Paint total */}
              <tr>
                <td>Paint</td>
                <td>${(data.breakdown?.paintMaterials || 0).toFixed(2)}</td>
              </tr>

              {/* Misc */}
              <tr>
                <td>Misc</td>
                <td>${(data.breakdown?.misc || 0).toFixed(2)}</td>
              </tr>

            </tbody>
          </table>
        </div>


        {/* TOTAL */}
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

  function formatMake(s) {
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  }

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

              <div className="reportselectfields">
                <label>Select Vehicle:</label>
                <select value={selectedVehicle?._id || ""} onChange={handleVehicleChange}>
                  <option value="">Select Vehicle</option>
                  {vehicles.map((v) => (
                    <option key={v._id} value={v._id}>
                      {v.year} {v.make} {v.model}
                    </option>
                  ))}
                </select>
                {selectedVehicle ? (
                  <div className="reportselecteds aiscan-selected-vehicle-box">
                    <p><strong>Year:</strong> {selectedVehicle.year}</p>
                    <p><strong>Make:</strong> {selectedVehicle.make}</p>
                    <p><strong>Model:</strong> {selectedVehicle.model}</p>
                    <p><strong>Engine:</strong> {selectedVehicle.engine}</p>
                    <p><strong>Trim:</strong> {selectedVehicle.trim || "—"}</p>
                  </div>
                ) : (
                  <p className="aiscan-placeholder">Select a vehicle above.</p>
                )}
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
                      <div>
                        <strong>
                          {`${est.vehicle?.year || est.year || "Unknown Year"} ${formatMake(est.vehicle?.make)} ${est.vehicle?.model || ""} (${(est.parts || []).length} parts)`}
                        </strong>
                        <p>Date: {new Date(est.createdAt).toLocaleString()}</p>
                      </div>

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
          <img src={fullImage} alt="Full View"/>
        </div>
      )}
    </div>
  );
}

// Hisham Issa {100%}