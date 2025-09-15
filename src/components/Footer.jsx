import React from 'react'
import '../styles/Footer.css'
import footerLogo from '../assets/TrueRepairs.png'
import x from '../assets/x.png'
import insta from '../assets/insta.png'

const Footer = () => {
  return (
    <div className='footer'>
        <div className="footer-container">
            <div className='footer-top'>
                <ul className='list'>
                    <li>Home</li>
                    <li>Features</li>
                    <li>About Us</li>
                    <li>Contact Us</li>
                </ul>
                <div className='social'>
                    <a href="https://www.instagram.com"><img src={insta} alt="" /></a>
                    <a href="https://www.x.com"><img src={x} alt="" /></a>
                </div>
            </div>
            <hr/>
            <div className='footer-bottom'>
                <img className='footer-logo' src={footerLogo} alt="" />
                <p>© 2025 TrueRepairs. All rights reserved.</p>
            </div>
        </div>
    </div>
  )
}

export default Footer