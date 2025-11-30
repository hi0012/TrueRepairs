import React, { useEffect, useState } from 'react'
import '../styles/Navbar.css'
import logo from '../assets/logoslogan.png'
import TinyLogo from '../assets/logo.png'
import SigninPopup from './SigninPopup'
import RegisterPopup from './RegisterPopup'
import { useLocation, Link, useNavigate } from 'react-router-dom'
import { Menu, X } from 'lucide-react';

const Navbar = ({ setSignInActive }) => {
  const [signinOpen, setSigninOpen] = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation()

  const onDashboard = location.pathname.startsWith("/dashboard")
  const navigate = useNavigate();

  const retrieveUser = () => {
    try {
      return JSON.parse(localStorage.getItem("user"))
    } catch {
      return null
    }
  }
  const [user, setUser] = useState(retrieveUser);

  // Handles Logouts
  const handleLogout = () => {
    localStorage.removeItem("user")
    setUser(null);
    window.dispatchEvent(new Event("userState"));
    navigate("/");
  }
  useEffect(()=> {
    const userData = localStorage.getItem("user")
    setUser(userData ? JSON.parse(userData) : null)
  }, [location.pathname])

  return (
    <nav className="navbar">
      {/* Logo */}
      <Link to="/" className="nav-logo-container">
        <img className="nav-logo" src={TinyLogo} alt="Tiny TrueRepairs Logo" />
        <img className="nav-logo" src={logo} alt="TrueRepairs Logo" />
      </Link>

      {/* Hamburger */}
      <div className="nav-toggle" onClick={() => setMenuOpen(!menuOpen)}>
        {menuOpen ? <X size={28} /> : <Menu size={28} />}
      </div>

      {/* Nav Links */}
      <ul className={`nav-list ${menuOpen ? 'active' : ''}`}>
        <li><a href="/#features" onClick={() => setMenuOpen(false)}>Features</a></li>
        <li><a href="/#aboutus" onClick={() => setMenuOpen(false)}>About Us</a></li>
        <li><a href="/#contactus" onClick={() => setMenuOpen(false)}>Contact Us</a></li>
      </ul>

      {/* Right-side buttons */}
      <div className={`nav-right ${menuOpen ? 'active' : ''}`}>
        {onDashboard ? (
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        ) : !user ? (
          <>
            <button onClick={() => setSignInActive(true)}>Sign In</button>
            <button onClick={() => setRegisterOpen(true)}>Register</button>
          </>
        ) : (
          <>
            <button className='homepage-dashboard-btn' onClick={() => navigate("/dashboard")}>Dashboard</button>
            <button className="homepage-logout-btn" onClick={handleLogout}>Logout</button>
          </>
        )}
      </div>

      {/* Popups*/}
      <SigninPopup open={signinOpen} onClose={() => setSigninOpen(false)} />
      <RegisterPopup open={registerOpen} onClose={() => setRegisterOpen(false)} />
    </nav>
  )
}

export default Navbar

// Ishmeal Gonzales {100%}