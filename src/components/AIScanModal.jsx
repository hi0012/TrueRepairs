import { useEffect, useState } from "react";
import "../styles/AIScanModal.css";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const usd = (n) =>
  typeof n === "number"
    ? n.toLocaleString(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      })
    : n;

const capFirst = (s) =>
  typeof s === "string" && s.length
    ? s.charAt(0).toUpperCase() + s.slice(1)
    : s;

export default function AIScanModal({ open, onClose, userEmail }) {
  const [laborRate, setLaborRate] = useState(110);
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (open) {
      setMsg("");
      setResult(null);
      setFiles([]);
      loadHistory();
    }
  }, [open]);

  const handleClose = () => {
    if (submitting) return;
    if (onClose) onClose();
  };

  async function loadHistory() {
    if (!userEmail) return;
    try {
      const res = await fetch(
        `${API}/api/estimates?email=${encodeURIComponent(userEmail)}`
      );
      const j = await res.json();
      setHistory(Array.isArray(j.items) ? j.items : []);
    } catch (err) {
      console.error("Failed to load history", err);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");

    if (!userEmail || !files.length) {
      setMsg("Email and at least one image are required.");
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("email", userEmail);
      fd.append("laborRate", laborRate);
      files.forEach((f) => fd.append("files", f));

      const res = await fetch(`${API}/api/estimate`, {
        method: "POST",
        body: fd,
      });

      const j = await res.json();
      if (!res.ok) {
        throw new Error(j.message || "AI estimate failed.");
      }

      setResult(j);
      await loadHistory();
    } catch (err) {
      console.error("Upload/estimate error", err);
      setMsg(err.message || "Something went wrong while processing images.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!id) return;
    if (!window.confirm("Delete this estimate from history?")) return;

    try {
      const res = await fetch(`${API}/api/estimates/${id}`, {
        method: "DELETE",
      });
      const j = await res.json();
      if (!res.ok) {
        throw new Error(j.message || "Delete failed.");
      }
      setHistory((prev) => prev.filter((h) => h._id !== id));
      if (result && result.id === id) {
        setResult(null);
      }
    } catch (err) {
      console.error("Delete error", err);
      setMsg(err.message || "Failed to delete estimate.");
    }
  }

  async function handleDownload(est) {
    try {
      const element = document.getElementById(`aiscan-report-${est._id}`);
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "pt", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const logo = new Image();
      logo.src = "/logo.png";
      const logo2 = new Image();
      logo2.src = "/TrueRepairs.png";

      const imgProps = pdf.getImageProperties(imgData);
      const ratio = Math.min(
        (pageWidth - 40) / imgProps.width,
        (pageHeight - 120) / imgProps.height
      );
      const imgWidth = imgProps.width * ratio;
      const imgHeight = imgProps.height * ratio;
      const imgX = (pageWidth - imgWidth) / 2;
      const imgY = 60;

      pdf.addImage(imgData, "PNG", imgX, imgY, imgWidth, imgHeight);

      try {
        pdf.addImage(logo, "PNG", 30, 15, 90, 30);
      } catch (e) {
        console.warn("Logo load failed", e);
      }
      try {
        pdf.addImage(logo2, "PNG", pageWidth - 150, 15, 120, 30);
      } catch (e) {
        console.warn("Logo2 load failed", e);
      }

      pdf.save(`AI_Estimate_${est._id}.pdf`);
    } catch (err) {
      console.error("PDF download failed", err);
      setMsg("Failed to generate PDF. Please try again.");
    }
  }

  if (!open) return null;

  const renderDamages = (damages) => {
    if (!Array.isArray(damages) || !damages.length) return null;

    return (
      <>
        <h4>Detected Damages</h4>
        <ul className="aiscan-damages-list">
          {damages.map((d, i) => {
            const accuracy =
              typeof d.maxConfidence === "number"
                ? Math.round(d.maxConfidence * 100)
                : null;

            const sources =
              Array.isArray(d.sources) && d.sources.length
                ? d.sources.map((idx) => idx + 1)
                : [];

            return (
              <li key={i} className="aiscan-damage-item">
                <div>
                  <strong>{d.part || "Unknown part"}</strong>{" "}
                  <span>
                    (
                    {d.operation
                      ? capFirst(d.operation)
                      : "Operation unknown"}
                    )
                  </span>
                </div>

                <div className="aiscan-damage-meta">
                  {d.worstSeverity && (
                    <span>Severity: {capFirst(d.worstSeverity)}</span>
                  )}
                  {accuracy !== null && (
                    <span> · Accuracy: {accuracy}%</span>
                  )}
                  {sources.length > 0 && (
                    <span>
                      {" "}
                      · Source image
                      {sources.length > 1 ? "s" : ""}:{" "}
                      {sources.join(", ")}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </>
    );
  };

  const renderBreakdown = (breakdown) => {
    if (!breakdown) return null;

    if (!Array.isArray(breakdown)) {
      const laborHours = breakdown.laborHours ?? breakdown.totalLaborHours;
      const partsTotal = breakdown.parts ?? breakdown.partsTotal;
      const paint = breakdown.paintMaterials;
      const misc = breakdown.misc;

      return (
        <div className="aiscan-breakdown">
          <h4>Breakdown</h4>
          <table className="aiscan-breakdown-table">
            <tbody>
              {typeof laborHours === "number" && (
                <tr>
                  <td>Labor Hours</td>
                  <td>{laborHours}</td>
                </tr>
              )}
              {typeof laborRate === "number" &&
                typeof laborHours === "number" && (
                  <tr>
                    <td>Labor Cost</td>
                    <td>{usd(laborHours * laborRate)}</td>
                  </tr>
                )}
              {typeof partsTotal === "number" && (
                <tr>
                  <td>Parts</td>
                  <td>{usd(partsTotal)}</td>
                </tr>
              )}
              {typeof paint === "number" && (
                <tr>
                  <td>Paint / Materials</td>
                  <td>{usd(paint)}</td>
                </tr>
              )}
              {typeof misc === "number" && (
                <tr>
                  <td>Misc</td>
                  <td>{usd(misc)}</td>
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
              <th>Line Total</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.map((b, i) => (
              <tr key={i}>
                <td>{b.part || "—"}</td>
                <td>{b.operation || "—"}</td>
                <td>{b.hours ?? "—"}</td>
                <td>{b.total ? usd(b.total) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderEstimatePanel = (data, isHistory) => {
    if (!data) return null;

    const vehicle = data.vehicle || {};
    const damages = data.damages || [];
    const breakdown = data.breakdown;
    const total = data.totalEstimated;

    const accuracy =
      typeof vehicle.confidence === "number"
        ? Math.round(vehicle.confidence * 100)
        : null;

    const titleId = isHistory ? `aiscan-report-${data._id}` : "aiscan-report";

    return (
      <div id={titleId} className="aiscan-report">
        {(vehicle.label || accuracy !== null) && (
          <p className="aiscan-vehicle-line">
            <strong>Vehicle:</strong>{" "}
            {vehicle.label || "Unknown vehicle"}
            {accuracy !== null && (
              <span className="aiscan-vehicle-conf">
                {" "}
                · ~{accuracy}% accuracy
              </span>
            )}
          </p>
        )}
        {renderDamages(damages)}
        {renderBreakdown(breakdown)}
        {typeof total === "number" && (
          <p className="aiscan-total">
            <strong>Estimated Total:</strong> {usd(total)}
          </p>
        )}
      </div>
    );
  };

  const renderImages = (images) => {
    if (!Array.isArray(images) || !images.length) return null;

    return (
      <div className="aiscan-images">
        <h4>Uploaded Photos</h4>
        <div className="aiscan-images-grid">
          {images.map((img, idx) => {
            const src =
              (img &&
                (img.imageUrl ||
                  img.thumbUrl ||
                  img.secure_url ||
                  img.url ||
                  img.path)) ||
              img;
            if (!src) return null;
            return (
              <figure key={idx} className="aiscan-image-card">
                <img
                  src={src}
                  alt={`Image ${idx + 1}`}
                  className="aiscan-image-thumb"
                />
                <figcaption>Image {idx + 1}</figcaption>
              </figure>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="aiscan-modal-overlay">
      <div className="aiscan-modal">
        <div className="aiscan-modal-header">
          <h2>AI Damage Estimate</h2>
          <button
            type="button"
            className="aiscan-close-btn"
            onClick={handleClose}
          >
            ×
          </button>
        </div>

        <div className="aiscan-modal-body">
          <div className="aiscan-left-column">
            <form className="aiscan-form" onSubmit={handleSubmit}>
              <div className="aiscan-form-row">
                <label>
                  Labor Rate ($/hr)
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={laborRate}
                    onChange={(e) =>
                      setLaborRate(Number(e.target.value) || 0)
                    }
                  />
                </label>
              </div>

              <div className="aiscan-form-row">
                <label>
                  Photos
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) =>
                      setFiles(Array.from(e.target.files || []))
                    }
                  />
                </label>
                <small>
                  You can select multiple photos (front, rear, side, etc.). The
                  AI will analyze each one and build a combined estimate.
                </small>
              </div>

              {msg && <div className="aiscan-message">{msg}</div>}

              <button
                type="submit"
                className="aiscan-submit-btn"
                disabled={submitting}
              >
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
                    <button
                      type="button"
                      onClick={() =>
                        setExpanded((cur) =>
                          cur === est._id ? null : est._id
                        )
                      }
                    >
                      {expanded === est._id ? "▼" : "►"}{" "}
                      {new Date(est.createdAt).toLocaleString()}
                    </button>
                    <div className="aiscan-history-actions">
                      <button
                        type="button"
                        onClick={() => handleDownload(est)}
                      >
                        Download PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(est._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {expanded === est._id && (
                    <div className="aiscan-history-details">
                      {renderEstimatePanel(est, true)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="aiscan-modal-footer">
          <button
            type="button"
            className="aiscan-cancel-btn"
            onClick={handleClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
