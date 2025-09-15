import React, { useState } from 'react'
import '../styles/Navbar.css'
import logo from '../assets/TrueRepairs.png'
const Navbar = ({setSignInActive}) => {

    

  return (
    <div className='navbar'>
        <img className='nav-logo' src={logo} alt="" />
        <ul className="nav-list">
            <li>Features</li>
            <li>About Us</li>
            <li>Contact Us</li>
        </ul>
        <div className='nav-right'>
            <button onClick={()=>setSignInActive(true)}>Sign In</button>
        </div>
    </div>
  )
}

export default Navbar