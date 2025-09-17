import React, { useState } from 'react'
import Navbar from './components/Navbar'
import { Route, Routes, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import SigninPopup from './components/SigninPopup'
import Footer from './components/Footer'
import Dashboard from "./pages/Dashboard";


const App = () => {
  const [signInActive, setSignInActive] = useState(false);
  const location = useLocation();
  return (
    
    <div>
      <SigninPopup open={signInActive} onClose={() => setSignInActive(false)} />
      <div className='site'>
        {location.pathname !== "/dashboard" && (
          <Navbar setSignInActive={setSignInActive} />
        )}
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </div>
      <Footer/>
    </div>

  )
}

export default App