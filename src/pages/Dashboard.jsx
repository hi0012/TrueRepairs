import React, { useState } from "react";
import { Link } from "react-router-dom";
import "../styles/Dashboard.css";
import Profile from "../components/Profile";
import Settings from "../components/Settings";
import Support from "../components/Support";
import VehicleInfo from "../components/VehicleInfo";

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
          <div className="dashboard-box" onClick={() => popupOpen("vehicle")}>Vehicle Info</div>
          <div className="dashboard-box" onClick={() => popupOpen("profile")}>Profile</div>
          <Link to="" className="dashboard-box">AI Scan</Link>
          <Link to="" className="dashboard-box">Reports</Link>
          <div className="dashboard-box" onClick={()=>popupOpen("support")}>Support</div>
          <div className="dashboard-box" onClick={()=> popupOpen("settings")}>Settings</div>
        </div>
      </main>
      <Profile open={displayPopup === "profile"} onClose={popupClose}/>
      <Settings open={displayPopup === "settings"} onClose={popupClose} />
      <Support open={displayPopup === "support"} onClose={popupClose}/>
          <Link to="/scan" className="dashboard-box">AI Scan</Link>
          <Link to="/reports" className="dashboard-box">Reports</Link>
          <Link to="/support" className="dashboard-box">Support</Link>
          <Link to="/settings" className="dashboard-box">Settings</Link>
        </div>
      </main>

      <Profile open={displayPopup === "profile"} onClose={popupClose} />
      <VehicleInfo open={displayPopup === "vehicle"} onClose={popupClose} />
    </div>
  );
};

export default Dashboard;