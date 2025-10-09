import React, { useEffect, useState } from "react";
import { Link} from "react-router-dom";

import '../styles/Dashboard.css'
import Profile from "../components/Profile";

const Dashboard = () => {
  const [displayPopup, setDisplayPopup] = useState(null);
  const user = JSON.parse(localStorage.getItem("user"))
  const popupOpen = (popupOption) => {
    setDisplayPopup(popupOption);
  };

  const popupClose = () => {
    setDisplayPopup(null);
  };
  return (
    <div className="dashboard">
      <header className="dashboard-header">
        {user && (
          <div className="user-info">
            <h1>Welcome to your Dashboard</h1>
            <span>Hello, {user.email}</span>
          </div>
        )}
      </header>
      <main className="dashboard-content">
        <div className="box-grid">
          <Link to="" className="dashboard-box">Vehicle Info</Link>
          <div className="dashboard-box" onClick={() => popupOpen("profile")}>Profile</div>
          <Link to="" className="dashboard-box">AI Scan</Link>
          <Link to="" className="dashboard-box">Settings</Link>
          <Link to="" className="dashboard-box">Reports</Link>
          <Link to="" className="dashboard-box">Support</Link>
        </div>
      </main>
      <Profile open={displayPopup === "profile"} onClose={popupClose}/>
    </div>
  )
}

export default Dashboard;
