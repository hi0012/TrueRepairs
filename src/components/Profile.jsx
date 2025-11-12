import React, { useEffect, useRef, useState } from 'react'
import '../styles/Profile.css'
import { FaCheckCircle } from "react-icons/fa";
import { RiErrorWarningLine } from "react-icons/ri";
import axios from "axios";


const Profile = ({ open, onClose }) => {
    const [currentEmail, setCurrentEmail] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [clickPassword, setClickPassword] = useState(false);
    const [message, setMessage] = useState("");
    const [displayPopupEmail, setDisplayPopupEmail] = useState(false);
    const [displayPopupPassword, setDisplayPopupPassword] = useState(false);
    const [emailPassword, setEmailPassword] = useState(""); 

    const storedUser = JSON.parse(localStorage.getItem("user"));
    const email = storedUser?.email || localStorage.getItem("userEmail");
    const emailRef = useRef(null);

    const emailHandleSubmit = (e) => {
        e.preventDefault();
        if (emailRef.current.checkValidity()) {
            setDisplayPopupEmail(true);
        } else {
            emailRef.current.reportValidity();
        }
    };

    // updating email
    const handleProfileSave = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post("http://localhost:5000/update-profile", {
                currentEmail,
                newEmail,
                password: emailPassword
            });

            setMessage(res.data.message);

            // 2. Clear the new email field
            setNewEmail("");

            // 3. Wait 3 seconds to let the user read the message, THEN close the popup.
            setTimeout(() => {
                setDisplayPopupEmail(false);
                setMessage("");
                setEmailPassword(""); // Clear the password
            }, 3000);

            setTimeout(() => setMessage(""), 3000);
        } catch (err) {
            console.error("Error updating email:", err);
            setMessage(err.response?.data?.message || "Error updating email");
            setTimeout(() => setMessage(""), 3000);
        }
    };

    const passwordReq = {
        length: newPassword.length >= 8,
        number: /[0-9]/.test(newPassword),
        specialChar: /[!@#$%^&*().]/.test(newPassword),
        lowCase: /[a-z]/.test(newPassword),
        highCase: /[A-Z]/.test(newPassword),
    };

    useEffect(() => {
        if (open) {
            const user = JSON.parse(localStorage.getItem("user"));
            if (user && user.email) {
                setCurrentEmail(user.email);
            }
        } else {
            setNewPassword("");
            setCurrentPassword("");
            setConfirmNewPassword("");
            setClickPassword(false);
            setNewEmail("");
            setCurrentEmail("");
        }
    }, [open]);

    const passwordReqChecker =
        passwordReq.length &&
        passwordReq.lowCase &&
        passwordReq.number &&
        passwordReq.specialChar &&
        passwordReq.highCase;

    const passwordEqual = newPassword === confirmNewPassword;

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (newPassword !== confirmNewPassword) {
            setMessage("Passwords do not match.");
            return;
        }
        try {
            const res = await axios.post("http://localhost:5000/update-password", {
                currentPassword,
                newPassword,
                email,
            });

            setMessage(res.data.message || "Password reset successful!");
            
            setTimeout(() => {
                setDisplayPopupPassword(false);
                setMessage("");
                setNewPassword("");
                setConfirmNewPassword("");
                setClickPassword(false)
            }, 2000);
        } catch (err) {
            console.error("Error:", err);
            setMessage(
                err.response?.data?.message || "Error resetting password. Try again."
            );
            setTimeout(() => setMessage(""), 3000);
        }
    };

    return (
        open && (<div className='profile-overlay'>
            <div className='profile-popup'>
                <div className='profile-header'>
                    <h1>User Profile</h1>
                    <p>Manage your account profile by updating your email or password.</p>
                </div>
                <div className='profile-container'>
                    <div className='profile-edit-left'>
                        <h2>Update Email</h2>
                        <form className='email-form' ref={emailRef} onSubmit={emailHandleSubmit} noValidate>
                            <div>
                                <label>Current Email</label>
                                <input className='current-email' type="email" value={currentEmail} readOnly />
                            </div>
                            <div className='profile-new-email'>
                                <label>New Email</label>
                                <input
                                    required
                                    type="email"
                                    placeholder='Enter new email'
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                />
                            </div>
                            <div className='profile-save-new-email'>
                                <button className='save-email-btn' type='submit'>Save Changes</button>
                            </div>
                        </form>
                    </div>

                    <div className='profile-password-right'>
                        <h2>Update Password</h2>
                        <form className='password-form' onSubmit={handleSubmit}>
                            <div>
                                <label>New Password</label>
                                <input type="password" placeholder='Enter new password' value={newPassword} onChange={(e) => { setNewPassword(e.target.value); setClickPassword(true); }} required />
                            </div>
                            <div>
                                <label>Confirm new password</label>
                                <input type="password" placeholder='Confirm new password' value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} required />
                            </div>
                            <div className='error-message'>
                                {(clickPassword || confirmNewPassword.length > 0) && (
                                    <div className="profile-password-validator">
                                        <li className={passwordReq.length ? "correct" : "incorrect"}>{passwordReq.length ? <FaCheckCircle /> : <RiErrorWarningLine />} At least 8 characters long</li>
                                        <li className={passwordReq.lowCase ? "correct" : "incorrect"}>{passwordReq.lowCase ? <FaCheckCircle /> : <RiErrorWarningLine />} At least 1 lowercase letter (a-z)</li>
                                        <li className={passwordReq.highCase ? "correct" : "incorrect"}>{passwordReq.highCase ? <FaCheckCircle /> : <RiErrorWarningLine />} At least 1 uppercase letter (A-Z)</li>
                                        <li className={passwordReq.number ? "correct" : "incorrect"}>{passwordReq.number ? <FaCheckCircle /> : <RiErrorWarningLine />} At least 1 number (0-9)</li>
                                        <li className={passwordReq.specialChar ? "correct" : "incorrect"}>{passwordReq.specialChar ? <FaCheckCircle /> : <RiErrorWarningLine />} At least 1 special character (@ # $ % ^ &)</li>
                                        {confirmNewPassword.length > 0 && (
                                            <li className={passwordEqual ? "password-equal" : "password-mismatch"}>
                                                {passwordEqual ? (
                                                    <>
                                                        <FaCheckCircle /> Passwords match.
                                                    </>
                                                ) : (
                                                    <>
                                                        <RiErrorWarningLine /> Passwords don't match.
                                                    </>
                                                )}
                                            </li>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className='password-save-container'>
                                <button type='button' onClick={() => setDisplayPopupPassword(true)} disabled={!passwordReqChecker || !passwordEqual} className='password-save-btn'>Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
                <div className='profile-bottom'>
                    <button className='profile-cancel-btn' onClick={onClose}>Cancel</button>
                </div>
            </div>

            {displayPopupEmail && (
                <div className='email-confirm-overlay'>
                    <div className='email-confirm-popup'>
                        <span onClick={() => setDisplayPopupEmail(false)} className="close-email-confirm-popup">×</span>
                        <h2>Confirm Password to Update Email</h2>
                        <form onSubmit={handleProfileSave}>
                            <div className='email-confirm-password-input'>
                                <input
                                    required
                                    type="password"
                                    placeholder='Enter Password'
                                    value={emailPassword}
                                    onChange={(e) => setEmailPassword(e.target.value)}
                                />
                            </div>
                            <div className='email-confirm-popup-container'>
                                <button type="submit" className='confirm-save-email-btn'>
                                    Confirm
                                </button>
                            </div>
                        </form>
                        {message && (<p className={`email-message ${message.includes("successfully") ? 'success' : 'error'}`}>{message}</p>)}
                    </div>
                </div>
            )}

            {displayPopupPassword && (
                <div className='password-confirm-overlay'>
                    <div className='password-confirm-popup'>
                        <span onClick={() => setDisplayPopupPassword(false)} className="close-password-confirm-popup">×</span>
                        <h2>Confirm Current Password</h2>
                        <form onSubmit={handleSubmit} action="">
                            <div className='confirm-password-input'>
                                <input required type="password" placeholder='Enter in current password' value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                            </div>
                            {message && (<p className={`reset-message ${message === "Password updated successfully!" ? "correct" : "incorrect"}`}>{message}</p>)}
                            <div className='password-confirm-popup-container'>
                                <button type='submit' className='save-password-btn'>Confirm</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>)
    )
}

export default Profile