import React, { useState } from 'react'
import '../styles/Navbar.css'
import logo from '../assets/TrueRepairs.png'
import SigninPopup from './SigninPopup'
import RegisterPopup from './RegisterPopup'
import { useLocation } from 'react-router-dom';

const Navbar = ({setSignInActive}) => {
  const [signinOpen, setSigninOpen] = useState(false)
  const [RegisterOpen, setRegisterOpen] = useState(false)
  const location = useLocation();
  const hideAuthButtons = location.pathname.startsWith("/reset-password");
  return (
    <div className="navbar">
      <img className="nav-logo" src={logo} alt="TrueRepairs Logo" />
      <ul className="nav-list">
        <li>Features</li>
        <li>About Us</li>
        <li>Contact Us</li>
      </ul>
      <div className="nav-right">
        {!hideAuthButtons && (
          <>
            <button onClick={() => setSignInActive(true)}>Sign In</button>
            <button onClick={() => setRegisterOpen(true)}>Register</button>
          </>
        )}
      </div>

      <SigninPopup open={signinOpen} onClose={() => setSigninOpen(false)} />
      <RegisterPopup open={RegisterOpen} onClose={() => setRegisterOpen(false)} />
    </div>
  )
}

export default Navbar