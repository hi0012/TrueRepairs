import React, { useState } from 'react'
import '../styles/Navbar.css'
import logo from '../assets/TrueRepairs.png'
import SigninPopup from './SigninPopup'
import RegisterPopup from './RegisterPopup'
import { useLocation, Link, useNavigate } from 'react-router-dom'

const Navbar = ({ setSignInActive }) => {
  const [signinOpen, setSigninOpen] = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)
  const location = useLocation()

  const onDashboard = location.pathname.startsWith("/dashboard")
  const navigate = useNavigate();

  // Handles Logouts
  const handleLogout = () => {
    localStorage.removeItem("user")
    navigate("/");
  }

  return (
    <div className="navbar">
      <Link to="/">
        <img className="nav-logo" src={logo} alt="TrueRepairs Logo" style={{ cursor: "pointer" }}/>
      </Link>

      <ul className="nav-list">
        <li>Features</li>
        <li>About Us</li>
        <li>Contact Us</li>
      </ul>

      <div className="nav-right">
        {onDashboard ? (
          // Show profile icon on dashboard only
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        ) : (
          // Otherwise show auth buttons
          <>
            <button onClick={() => setSignInActive(true)}>Sign In</button>
            <button onClick={() => setRegisterOpen(true)}>Register</button>
          </>
        )}
      </div>

      <SigninPopup open={signinOpen} onClose={() => setSigninOpen(false)} />
      <RegisterPopup open={registerOpen} onClose={() => setRegisterOpen(false)} />
    </div>
  )
}

export default Navbar
