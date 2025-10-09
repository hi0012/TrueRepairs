import React, { useState } from 'react'
import '../styles/Footer.css'
import footerLogo from '../assets/TrueRepairs.png'
import footerWhiteLogo from '../assets/logowhite.png'
import { MdLocationPin } from 'react-icons/md'
import { AiOutlineMail } from 'react-icons/ai'
import { FaPhone } from 'react-icons/fa'
import PrivacyPolicy from './PrivacyPolicy'
import TermsAndConditions from './TermsAndConditions'

const Footer = () => {
  const [displayTermsAndConditions, setDisplayTermsAndConditions] = useState(false);
  const [displayPrivacyPopup, setDisplayPrivacyPopup] = useState(false);
  return (
    <div className='footer'>
      <div className='footer-container'>
        <div className='footer-top-container'>
          <div className='footer-top-left'>
            <img src={footerWhiteLogo} alt="" />
            <p className='catchphrase'>From identifying damage to making repair decisions, we make the process easy and stress-free.</p>
          </div>
          <div className='footer-top-right'>
            <p><MdLocationPin /> State Hall, 5143 Cass Ave, Detroit, MI 48202</p>
            <p><AiOutlineMail /> TrueRepairs@gmail.com</p>
            <p><FaPhone /> (325) 653-5423</p>
          </div>
        </div>
        <hr />
        <div className='footer-bottom-container'>
          <div className='footer-bottom-left'>
            <p>©2025 TrueRepairs. All rights reserved.</p>
          </div>
          <div className='footer-bottom-right'>
            <ul className='list'>
              <li className='tos' onClick={()=>setDisplayTermsAndConditions(true)}>Terms and Conditions</li>
              <li className='privacy' onClick={()=>setDisplayPrivacyPopup(true)}>Privacy Policy</li>
            </ul>
          </div>
        </div>
      </div>
      {displayTermsAndConditions && <TermsAndConditions onClose={()=> setDisplayTermsAndConditions(false)}/>}
      {displayPrivacyPopup && <PrivacyPolicy onClose={()=> setDisplayPrivacyPopup(false)}/>}
    </div>
  )
}

export default Footer