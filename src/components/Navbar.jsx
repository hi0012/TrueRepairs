import React, { useEffect, useState } from 'react'
import '../styles/Navbar.css'
import logo from '../assets/TrueRepairs.png'
import TinyLogo from '../assets/logo.png'
import SigninPopup from './SigninPopup'
import RegisterPopup from './RegisterPopup'
import { useLocation, Link, useNavigate } from 'react-router-dom'

const Navbar = ({ setSignInActive }) => {
  const [signinOpen, setSigninOpen] = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)
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
    navigate("/");
  }
  useEffect(()=> {
    const userData = localStorage.getItem("user")
    setUser(userData ? JSON.parse(userData) : null)
  }, [location.pathname])

  return (
    <div className="navbar">
      <Link to="/">
        <img className="nav-logo" src={TinyLogo} alt="TrueRepairs Logo" style={{ cursor: "pointer" }}/>
        <img className="nav-logo" src={logo} alt="TrueRepairs Logo" style={{ cursor: "pointer" }}/>
      </Link>

      <ul className="nav-list">
        <li><a href="/#features">Features</a></li>
        <li><a href="/#aboutus">About Us</a></li>
        <li><a href="/#contactus">Contact Us</a></li>
      </ul>

      <div className="nav-right">
        {onDashboard ? (
          // Show profile icon on dashboard only
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        ) : !user ? (
          // Otherwise show auth buttons
          <>
            <button onClick={() => setSignInActive(true)}>Sign In</button>
            <button onClick={() => setRegisterOpen(true)}>Register</button>
          </>
        ) : (
          <>
            <button onClick={()=>navigate("/dashboard")}>Dashboard</button>
            <button className='homepage-logout-btn' onClick={handleLogout}>Logout</button>
          </>
        )}
      </div>

      <SigninPopup open={signinOpen} onClose={() => setSigninOpen(false)} />
      <RegisterPopup open={registerOpen} onClose={() => setRegisterOpen(false)} />
    </div>
  )
}

export default Navbar
