import React from 'react'
import '../styles/Footer.css'
import footerLogo from '../assets/TrueRepairs.png'

const Footer = () => {
  return (
    <div className='footer'>
        <div className="footer-container">
            <div className='footer-bottom'>
                <img className='footer-logo' src={footerLogo} alt="" />
                <p>© 2025 TrueRepairs. All rights reserved.</p>
            </div>
        </div>
    </div>
  )
}

export default Footer