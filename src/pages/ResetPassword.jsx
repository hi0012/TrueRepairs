import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios"; 
import '../styles/ResetPassword.css'
import { RiErrorWarningLine } from 'react-icons/ri';
import { FaCheckCircle } from 'react-icons/fa';

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
            <li className={passwordReq.length ? "correct" : "incorrect"}>{passwordReq.length ? <FaCheckCircle/> : <RiErrorWarningLine/>} At least 8 characters long</li>
            <li className={passwordReq.lowCase ? "correct" : "incorrect"}>{passwordReq.lowCase ? <FaCheckCircle/> : <RiErrorWarningLine/>} At least 1 lowercase letter (a-z)</li>
            <li className={passwordReq.highCase ? "correct" : "incorrect"}>{passwordReq.highCase ? <FaCheckCircle/> : <RiErrorWarningLine/>} At least 1 uppercase letter (A-Z)</li>
            <li className={passwordReq.number ? "correct" : "incorrect"}>{passwordReq.number ? <FaCheckCircle/> : <RiErrorWarningLine/>} At least 1 number (0-9)</li>
            <li className={passwordReq.specialChar ? "correct" : "incorrect"}>{passwordReq.specialChar ? <FaCheckCircle/> : <RiErrorWarningLine/>} At least 1 special character (@ # $ % ^ &)</li>
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
