import React, { useEffect, useState } from 'react'
import '../styles/Settings.css'
import axios from "axios";

const Settings = ({ open, onClose }) => {
    const [displayDeletePopup, setDisplayDeletePopup] = useState(false);
    const [displayDeactivatePopup, setDisplayDeactivatePopup] = useState(false);
    const [loginTime, setLoginTime] = useState(null);
    const [locateCity, setLocateCity] = useState("");
    const [deactivatePassword, setDeactivatePassword] = useState("");
    const [deletePassword, setDeletePassword] = useState("");
    const [message, setMessage] = useState("");
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const email = storedUser?.email

    useEffect(() => {
        const retrievedTime = localStorage.getItem("loginTime");
        if (retrievedTime) {
            const timeFormat = new Date(retrievedTime).toLocaleDateString();
            setLoginTime(timeFormat);
        }
        fetch("https://ipapi.co/json/")
            .then((res) => res.json())
            .then((location) => {
                setLocateCity(location.city);
            })
    }, []);

    const handleDeactivateAccount = async () => {
        try {
        const res = await axios.post("http://localhost:5000/deactivate-account", {
            email: email,
            password: deactivatePassword
        });

        if (res.data.success) {
            setMessage("Account deactivated successfully.");
            // Optionally clear local storage
            localStorage.clear();
            setTimeout(() => window.location.reload(), 2000);
        } else {
            setMessage(`${res.data.message}`);
        }
        } catch (err) {
        console.error(err);
        setMessage("Error deactivating account.");
        }
    };

    const handleDeleteAccount = async () => {
        try {
            const res = await axios.post("http://localhost:5000/delete-account", {
            email: email,
            password: deletePassword
            });

            if (res.data.success) {
            // Show a quick local confirmation (optional)
            setMessage("Account deleted successfully.");

            // Clear all stored user data
            localStorage.clear();

            // Redirect to homepage with "deleted=true" param
            setTimeout(() => {
                window.location.href = "/?deleted=true";
            }, 1500);
            } else {
            setMessage(res.data.message);
            }
        } catch (err) {
            console.error(err);
            setMessage("Error deleting account.");
        }
    };

    return (
        open && (
            <div className='settings-overlay'>
                <div className='settings-popup'>
                    <div className='settings-header'>
                        <h1>Account Settings</h1>
                    </div>
                    <div className='settings-container'>
                        <div className='settings-left'>
                            <div className='settings-left-title'>
                                <h1>System Information</h1>
                            </div>
                            <div className='settings-left-content'>
                                <div className='row'>
                                    <span className='title'>Website Version:</span>
                                    <span className='value'>V2.0.0</span>
                                </div>
                                <div className='row'>
                                    <span className='title'>Last Login:</span>
                                    <span className='value'>{loginTime ? loginTime : "No login recorded"}</span>
                                </div>
                                <div className='row'>
                                    <span className='title'>Login Location:</span>
                                    <span className='value'>{locateCity ? locateCity : "No city recorded"}</span>
                                </div>
                            </div>
                        </div>
                        <div className='settings-middle'>
                            <div className='settings-middle-title'>
                                <h1>Deactivate Account</h1>
                            </div>
                            <div className='settings-middle-content'>
                                <p>Temporarily disable your account. Your data will be saved, and you can reactivate your account anytime by logging back in.</p>
                            </div>
                            <div className='settings-middle-bottom'>
                                <button onClick={() => setDisplayDeactivatePopup(true)} className='settings-deactivate-btn'>Deactivate Account</button>
                            </div>
                        </div>
                        <div className='settings-right'>
                            <div className='settings-right-title'>
                                <h1>Delete Account</h1>
                            </div>
                            <div className='settings-right-content'>
                                <p>Deleting your account will permanently erase all your data from TrueRepair. This action can’t be undone.
                                </p>
                            </div>
                            <div className='setting-right-bottom'>
                                <button onClick={() => setDisplayDeletePopup(true)} className='settings-delete-btn'>Delete Account</button>
                            </div>
                        </div>
                    </div>
                    <div className='settings-bottom'>
                        <button className='settings-cancel-btn' onClick={onClose}>Cancel</button>
                    </div>
                </div>
                {displayDeletePopup && (
                    <div className='delete-overlay'>
                        <div className='delete-popup'>
                            <span onClick={() => setDisplayDeletePopup(false)} className="close-confirm-password-popup">×</span>
                            <h2>Confirm Password to delete account</h2>
                            <div className='delete-password-input'>
                                <input type="password" placeholder='Enter Password' value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} />
                            </div>
                            <div className='delete-popup-btns'>
                                <button onClick={handleDeleteAccount} className='delete-account'>Delete account</button>
                            </div>
                        </div>
                    </div>
                )}
                {displayDeactivatePopup && (
                    <div className='deactivate-overlay'>
                        <div className='deactivate-popup'>
                            <span onClick={() => setDisplayDeactivatePopup(false)} className="close-confirm-password-popup">×</span>
                            <h2>Confirm Password to deactivate account</h2>
                            <div className='deactivate-password-input'>
                                <input type="password" placeholder='Enter Password' value={deactivatePassword} onChange={(e) => setDeactivatePassword(e.target.value)} />
                            </div>
                            <div className='deactivate-popup-btns'>
                                <button onClick={handleDeactivateAccount} className='deactivate-account'>Deactivate account</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )
    )
}

export default Settings