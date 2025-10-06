import React from 'react'
import '../styles/TermsAndConditions.css'

const TermsAndConditions = ({onClose}) => {
  return (
    <div className='terms-and-conditions-container' onClick={onClose}>
            <div className='terms-and-conditions-popup' onClick={(e) => e.stopPropagation()}>
                <h1>TrueRepairs'</h1>
                <h2>Terms and Conditions Policy</h2>
                <div className='terms-and-conditions-policy'>
                    <div className='terms-and-conditions-policy-content'>
                        <p>Terms and Conditions<br/>Last Updated: 10/05/2025<br/><br/>By using TrueRepairs, you agree to the following terms. You may use our website only for lawful purposes and must not misuse it or attempt to access unauthorized areas.<br/><br/>If you create an account,
                        you are responsible for keeping your email and password secure and for any activity that occurs under your account.<br/><br/>All content on this website, including text, images, and logos, is owned by TrueRepairs and may not be copied or used without permission.<br/><br/>
                        We are not responsible for any errors, omissions, or damages resulting from your use of the site. Our website may contain links to third-party sites, and we are not responsible for their content or practices.<br/><br/>
                        We may update these Terms at any time. Continued use of our website means you accept the latest version.</p>
                    </div>
                </div>

                <button className='terms-and-conditions-policy-cloes-btn' onClick={onClose}>Close</button>
            </div>

        </div>
  )
}

export default TermsAndConditions