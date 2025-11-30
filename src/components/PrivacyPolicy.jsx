import React from 'react'
import '../styles/PrivacyPolicy.css'

const PrivacyPolicy = ({ onClose }) => {
    return (
        <div className='privacy-container' onClick={onClose}>
            <div className='privacy-popup' onClick={(e) => e.stopPropagation()}>
                <h1>TrueRepairs'</h1>
                <h2>Privacy Policy</h2>
                <div className='privacy-policy'>
                    <div className='privacy-policy-content'>
                        <p>At TrueRepairs, we respect your privacy and are committed to protecting your personal information. This Privacy Policy explains how we handle the information you provide when using our website or services. When you create an account, we collect your email address and password to help you sign in securely and access our features. We do not collect any other personal details unless you choose to share them with us.
                            Your information is used only to maintain your account, improve our services, and keep your experience secure. We do not sell or share your data with third parties, except when required by law or to protect our system from unauthorized access.
                            We take reasonable security measures to keep your information safe, but please note that no online platform can guarantee complete protection. By using our site, you agree to this Privacy Policy and the way we handle your data.</p>
                    </div>
                </div>

                <button className='privacy-policy-cloes-btn' onClick={onClose}>Close</button>
            </div>

        </div>
    )
}

export default PrivacyPolicy

// Ishmeal Gonzales {100%}