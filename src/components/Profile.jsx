import React, { useEffect, useState } from 'react'
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
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [userName, setUserName] = useState("");


    const storedUser = JSON.parse(localStorage.getItem("user"));
    const email = storedUser?.email || localStorage.getItem("userEmail");

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
                setFirstName(user.firstName || "");
                setLastName(user.lastName || "");
                setUserName(user.userName || "");
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

    const handleProfileSave = async () => {
        try {
            const res = await axios.post("http://localhost:5000/update-profile", {
            email: currentEmail,
            firstName,
            lastName,
            userName
            });

            setMessage(res.data.message);

            const updatedUser = {
            ...JSON.parse(localStorage.getItem("user")),
            firstName,
            lastName,
            userName
            };
            localStorage.setItem("user", JSON.stringify(updatedUser));

            setTimeout(() => setMessage(""), 3000);
        } catch (err) {
            console.error(err);
            setMessage("Error updating profile");
            setTimeout(() => setMessage(""), 3000);
        }
    };


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
            setTimeout(() => setMessage(""), 3000);
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
                    <p>Manage your acount profile by updating your email or password.</p>
                </div>
                <div className='profile-container'>
                    <div className='profile-edit-left'>
                        <h2>Edit Profile</h2>
                        <div className='profile-name'>
                            <div className='profile-first-name'>
                                <label htmlFor="">First Name</label>
                                <input type="text" placeholder='First Name (Optional)' value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                            </div>
                            <div className='profile-last-name'>
                                <label htmlFor="">Last Name</label>
                                <input type="text" placeholder='Last Name (Optional)' value={lastName} onChange={(e) => setLastName(e.target.value)} />
                            </div>
                        </div>
                        <div className='profile-username'>
                            <label htmlFor="">Username</label>
                            <input type="text" placeholder='Username (Optional)' value={userName} onChange={(e) => setUserName(e.target.value)} />
                        </div>
                        <div className='profile-email-container'>
                            <hr className='hr-divider'/>
                            <div className='profile-current-email'>
                                <label htmlFor="">Current email</label>
                                <input type="email" value={currentEmail} readOnly></input>
                            </div>
                            <div className='profile-new-email'>
                                <label htmlFor="">New email</label>
                                <input type="email" placeholder='Enter new email' value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                            </div>
                        </div>
                        <div className='edit-save-container'>
                            <button className='email-save-btn' onClick={handleProfileSave}>Save Changes</button>
                        </div>
                    </div>


                    <div className='profile-password-right'>
                        <h2>Update Password</h2>
                        <form onSubmit={handleSubmit}>
                            <div>
                                <label htmlFor="">Current password</label>
                                <input type="password" placeholder='Enter in current password' value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required/>
                            </div>
                            <div className='profile-passwords-fields'>
                                <div className='password-new-password-container'>
                                    <label htmlFor="">New password</label>
                                    <input type="password" placeholder='Enter in new password' value={newPassword} onChange={(e) => { setNewPassword(e.target.value); setClickPassword(true); }} required/>
                                </div>
                                <div className='password-confirm-password-container'>
                                    <label htmlFor="">Confirm new password</label>
                                    <input type="password" placeholder='Confirm new password' value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} required/>
                                </div>

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
                                <button type='submit' disabled={!passwordReqChecker || !passwordEqual} className='password-save-btn'>Save Changes</button>
                            </div>
                        </form>
                        {message && (<p className={`reset-message ${message === "Password updated successfully!"? "correct": "incorrect"}`}>{message}</p>)}
                    </div>
                </div>
                <div className='profile-bottom'>
                    <button className='profile-cancel-btn' onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>
        )

    )
}

export default Profile