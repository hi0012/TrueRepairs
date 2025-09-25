import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios"; 
import '../styles/ResetPassword.css'

const ResetPassword = () => {
  const { token } = useParams();   
  const navigate = useNavigate(); 

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");

  // Password requirements checker
  const passwordReq = {
    length: password.length >= 8,
    number: /[0-9]/.test(password),
    specialChar: /[!@#$%^&*().]/.test(password),
    lowCase: /[a-z]/.test(password),
    highCase: /[A-Z]/.test(password),
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    if (password !== confirm) {
      setMessage("Passwords do not match.");
      return;
    }

    axios.post(`http://localhost:3000/reset-password/${token}`, { password })
      .then((res) => {
        setMessage(res.data.message || "Password reset successful!");
        setTimeout(() => {
          navigate("/");
        }, 2000);
      })
      .catch((err) => {
        console.error(err);
        setMessage("Error resetting password. Try again.");
      });
  };

  return (
    <div className="reset-page">
      <div className="reset-form">
        <h3>Reset Your Password</h3>
        <form onSubmit={handleSubmit}>
          <input 
            type="password" 
            placeholder="New Password" 
            required 
            onChange={(e) => setPassword(e.target.value)} 
          />
          <input 
            type="password" 
            placeholder="Confirm Password" 
            required 
            onChange={(e) => setConfirm(e.target.value)} 
          />

          {/* Password requirements */}
          <ul className="password-validator">
            {!passwordReq.length && <li>Must be at least 8 characters long</li>}
            {!passwordReq.lowCase && <li>Must have at least one lowercase letter</li>}
            {!passwordReq.highCase && <li>Must have at least one uppercase letter</li>}
            {!passwordReq.number && <li>Must have at least one number</li>}
            {!passwordReq.specialChar && <li>Must have at least one special character</li>}
          </ul>

          <div className="reset-forms-btns">
            <button type="submit">Update Password</button>
          </div>
        </form>

        {message && <p className="reset-message">{message}</p>}
      </div>
    </div>
  );
};

export default ResetPassword;
