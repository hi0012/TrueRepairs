import React from "react";
import { Link} from "react-router-dom";

import '../styles/Dashboard.css'

const Dashboard = () => {
  const user = JSON.parse(localStorage.getItem("user"))
  return (
    <div className="dashboard">
      <header className="dashboard-header">
        {user && (
          <div className="user-info">
            <h1>Welcome to your Dashboard</h1>
            <span>Hello, {user.firstName} {user.lastName}</span>
          </div>
        )}
      </header>
      <main className="dashboard-content">
        <div className="box-grid">
          <Link to="" className="dashboard-box">Vehicle Info</Link>
          <Link to="" className="dashboard-box">Profile</Link>
          <Link to="" className="dashboard-box">AI Scan</Link>
          <Link to="" className="dashboard-box">Settings</Link>
          <Link to="" className="dashboard-box">Reports</Link>
          <Link to="" className="dashboard-box">Support</Link>
        </div>
      </main>
    </div>
  )
}

export default Dashboard;
