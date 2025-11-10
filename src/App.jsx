import React, { useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import SigninPopup from "./components/SigninPopup";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import ResetPassword from "./pages/ResetPassword";

const App = () => {
  const [signInActive, setSignInActive] = useState(false);
  const location = useLocation();

  return (
    <div className="app-container">
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
        </Routes>
      </div>
      <Footer />
    </div>
  );
};

export default App;
