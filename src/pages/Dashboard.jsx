import React, { useState } from "react";
import { Link } from "react-router-dom";
import "../styles/Dashboard.css";
import Profile from "../components/Profile";
import Settings from "../components/Settings";
import Support from "../components/Support";
import VehicleInfo from "../components/VehicleInfo";
<<<<<<< HEAD
import Report from "../components/Reports";
import AIModal from "../components/AIScanModal";
import { IoCarSportOutline } from 'react-icons/io5';
import { FaRegUserCircle } from 'react-icons/fa';
import { LuScanSearch } from 'react-icons/lu';
import { LiaClipboardListSolid } from 'react-icons/lia';
import { LiaHandsHelpingSolid } from 'react-icons/lia';
import { MdOutlineAdminPanelSettings } from 'react-icons/md';
=======
import AIScanModal from "../components/AIScanModal";
>>>>>>> 447c1a4 (AI in progress: frontend AIScan modal + /api/estimate wiring, Cloudinary config, server route fixes)

const Dashboard = () => {
  const [displayPopup, setDisplayPopup] = useState(null);
  const user = JSON.parse(localStorage.getItem("user"));

  const popupOpen = (v) => setDisplayPopup(v);
  const popupClose = () => setDisplayPopup(null);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        {user && (
          <div className="user-info">
            <h1>Dashboard</h1>
          </div>
        )}
      </header>

      <main className="dashboard-content">
        <div className="box-grid">
<<<<<<< HEAD
          <div className="dashboard-box" onClick={() => popupOpen("vehicle")}><IoCarSportOutline className="icon"/> My Vehicles</div>
          <div className="dashboard-box" onClick={() => popupOpen("profile")}><FaRegUserCircle className="icon"/>User Profile</div>
          <div className="dashboard-box" onClick={() => popupOpen("aimodal")}><LuScanSearch className="icon"/>Smart Report</div>
          <div className="dashboard-box" onClick={() => popupOpen("report")}><LiaClipboardListSolid className="icon"/>Manual Report</div>
          <div className="dashboard-box" onClick={()=>popupOpen("support")}><LiaHandsHelpingSolid className="icon"/>Support</div>
          <div className="dashboard-box" onClick={()=> popupOpen("settings")}><MdOutlineAdminPanelSettings className="icon"/>Settings</div>
=======
          <div className="dashboard-box" onClick={() => popupOpen("vehicle")}>Vehicle Info</div>
          <div className="dashboard-box" onClick={() => popupOpen("profile")}>Profile</div>
          <div className="dashboard-box" onClick={() => popupOpen("ai")}>AI Scan</div>
          <Link to="" className="dashboard-box">Reports</Link>
          <div className="dashboard-box" onClick={() => popupOpen("support")}>Support</div>
          <div className="dashboard-box" onClick={() => popupOpen("settings")}>Settings</div>
>>>>>>> 447c1a4 (AI in progress: frontend AIScan modal + /api/estimate wiring, Cloudinary config, server route fixes)
        </div>
      </main>

      <Profile open={displayPopup === "profile"} onClose={popupClose} />
      <Settings open={displayPopup === "settings"} onClose={popupClose} />
      <Support open={displayPopup === "support"} onClose={popupClose} />
      <VehicleInfo open={displayPopup === "vehicle"} onClose={popupClose} />
<<<<<<< HEAD
      <Report open={displayPopup === "report"} onClose={popupClose} />
      <AIModal open={displayPopup === "aimodal"} onClose={popupClose} />
=======
      <AIScanModal open={displayPopup === "ai"} onClose={popupClose} />
>>>>>>> 447c1a4 (AI in progress: frontend AIScan modal + /api/estimate wiring, Cloudinary config, server route fixes)
    </div>
  );
};

export default Dashboard;
