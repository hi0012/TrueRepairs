import React, { useState } from "react";
import Navbar from "./components/Navbar";
import { Route, Routes, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import SigninPopup from "./components/SigninPopup";
import Footer from "./components/Footer";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import ResetPassword from "./pages/ResetPassword";
import VehicleInfo from "./pages/VehicleInfo";

const App = () => {
  const [signInActive, setSignInActive] = useState(false);
  const location = useLocation();

  return (
    <div>
      <SigninPopup open={signInActive} onClose={() => setSignInActive(false)} />
      <div className="site">
        <Navbar setSignInActive={setSignInActive} />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vehicle"
            element={
              <ProtectedRoute>
                <VehicleInfo />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
      <Footer />
    </div>
  );
};

export default App;
