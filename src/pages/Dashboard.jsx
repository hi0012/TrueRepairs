import React, { useState } from "react";
import { Link } from "react-router-dom";
import "../styles/Dashboard.css";
import Profile from "../components/Profile";
import Settings from "../components/Settings";
import Support from "../components/Support";
import VehicleInfo from "../components/VehicleInfo";
import { IoCarSportOutline } from 'react-icons/io5';
import { FaRegUserCircle } from 'react-icons/fa';
import { LuScanSearch } from 'react-icons/lu';
import { LiaClipboardListSolid } from 'react-icons/lia';
import { LiaHandsHelpingSolid } from 'react-icons/lia';
import { MdOutlineAdminPanelSettings } from 'react-icons/md';

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
          <div className="dashboard-box" onClick={() => popupOpen("vehicle")}><IoCarSportOutline className="icon"/> My Vehicles</div>
          <div className="dashboard-box" onClick={() => popupOpen("profile")}><FaRegUserCircle className="icon"/>User Profile</div>
          <Link to="" className="dashboard-box"><LuScanSearch className="icon"/>Smart Report</Link>
          <Link to="" className="dashboard-box"><LiaClipboardListSolid className="icon"/>Manual Report</Link>
          <div className="dashboard-box" onClick={()=>popupOpen("support")}><LiaHandsHelpingSolid className="icon"/>Support</div>
          <div className="dashboard-box" onClick={()=> popupOpen("settings")}><MdOutlineAdminPanelSettings className="icon"/>Settings</div>
        </div>
      </main>
      <Profile open={displayPopup === "profile"} onClose={popupClose}/>
      <Settings open={displayPopup === "settings"} onClose={popupClose} />
      <Support open={displayPopup === "support"} onClose={popupClose}/>
      <VehicleInfo open={displayPopup === "vehicle"} onClose={popupClose} />
    </div>
  );
};

export default Dashboard;