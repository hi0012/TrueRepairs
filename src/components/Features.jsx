import React, { useState } from "react";
import "../styles/Features.css";
import AiImage from "../assets/ai-feature.png";
import estimateImage from "../assets/estimate-feature.png";
import reportImage from "../assets/report-feature.png";
import AIScanModal from "../components/AIScanModal";

export default function Features({ userEmail }) {
  const [aiOpen, setAiOpen] = useState(false);
  const email = userEmail || "test@example.com";

  return (
    <>
      <div className="features" id="features">
        <h1>Features</h1>
        <div className="ai-feature-container">
          <div className="ai-feature-left">
            <img src={AiImage} alt="" />
          </div>
          <div className="ai-feature-right">
            <div className="ai-feature-content">
              <h2>Damage Detection tool<br /> powered by AI</h2>
              <p>Upload a photo of your car, and our AI will instantly analyze the image to detect damaged parts with pinpoint accuracy</p>
            </div>
          </div>
        </div>

        <div className="estimate-feature-container">
          <div className="estimate-feature-left">
            <div className="estimate-feature-content">
              <h2>Instant Repair Cost <br className="e-mobile"/>Estimates</h2>
              <p>Get real-time cost estimates for replacement parts and repairs based on your vehicle's make, model, and location.</p>
            </div>
          </div>
          <div className="estimate-feature-right">
            <img src={estimateImage} alt="" />
          </div>
        </div>

        <div className="report-feature-container">
          <div className="report-feature-left">
            <img src={reportImage} alt="" />
          </div>
          <div className="report-feature-right">
            <div className="report-feature-content">
              <h2>Easy-to-Use <br className="mobile"/>Dashboard</h2>
              <p>Track your repair reports, upload new images, and manage your vehicle history—all from a clean, user-friendly dashboard.</p>
            </div>
          </div>
        </div>
      </div>

      <AIScanModal open={aiOpen} onClose={() => setAiOpen(false)} userEmail={email} />
    </>
  );
}
