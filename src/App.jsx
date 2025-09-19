import React, { useState } from 'react';
import Navbar from './components/Navbar';
import { Route, Routes, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import SigninPopup from './components/SigninPopup';
import Footer from './components/Footer';
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";

const App = () => {
  const [signInActive, setSignInActive] = useState(false);
  const location = useLocation();

  return (
    <div>
      <SigninPopup open={signInActive} onClose={() => setSignInActive(false)} />
      <div className="site">
        {/* Hide navbar only on dashboard */}
        {location.pathname !== "/dashboard" && (
          <Navbar setSignInActive={setSignInActive} />
        )}

        <Routes>
          <Route path="/" element={<Home />} />

          {/* Protect the dashboard route */}
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
