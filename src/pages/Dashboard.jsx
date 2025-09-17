import React from "react";

const Dashboard = () => {
  const user = JSON.parse(localStorage.getItem("user"));

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Welcome to your Dashboard</h1>
        <div className="user-info">
          {user && <span>Hello, {user.firstName} {user.lastName}</span>}
        </div>
      </header>
    </div>
  );
};

export default Dashboard;
