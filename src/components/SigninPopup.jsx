import React, { useState, useEffect } from 'react';
import '../styles/SigninPopup.css';
import { useNavigate } from "react-router-dom";
import axios from 'axios';

const SigninPopup = ({open, onClose}) => {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayfp, setDisplayfp] = useState(false);
  const [message, setMessage] = useState("");
  const [message2, setMessage2] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setDisplayfp(false);
      setEmail("");
      setMessage("");
      setMessage2("");
      setPassword("");
    }
  }, [open]);

  const getLoginTime = () => {
    const time = new Date().toISOString();
    localStorage.setItem("loginTime", time);
  }

  const handleSubmit = (e) => {
    e.preventDefault();

    axios.post("http://localhost:5000/login", { email, password })
      .then((res) => {
        if (res.data.success) {
          localStorage.setItem("user", JSON.stringify(res.data.user));
          setMessage2("Login Successfully");

          setTimeout(() => {
            onClose();
            navigate("/dashboard");
          }, 1000);

          setTimeout(() => setMessage2(""), 1000);
          getLoginTime();
        } else {
          setMessage2("Invalid Login Credentials");
          setTimeout(() => setMessage2(""), 1000);
        }
      })
      .catch((err) => {
        console.error(err);
        alert("Error connecting to server");
      });
  };

  const handlePassReset = () => {
    if (!email) {
      alert("Please enter your email first.");
      return;
    }

    axios.post("http://localhost:5000/forgot-password", { email })
      .then((res) => {
        setMessage(res.data.message || "Reset link sent!");
        setTimeout(() => setMessage(""), 2000);
        setTimeout(() => onClose(), 2000);
      })
      .catch((err) => {
        console.error(err);
        setMessage("Error sending reset request.");
        setTimeout(() => setMessage(""), 2000);
      });
  };

  return open && (
    <div onMouseDown={(e) => { if (e.target === e.currentTarget) { onClose(); } }} className='signin'>
      <div onClick={e => e.stopPropagation()} className='signin-form'>
        <h3>Sign In</h3>
        <form onSubmit={handleSubmit}>
          <input 
            type="text"  
            placeholder='Email' 
            required={!displayfp} 
            onChange={(e) => setEmail(e.target.value)}
          />
          <input 
            type="password"  
            placeholder='Password' 
            required={!displayfp} 
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className='forms-btns'>
            <button type='submit' className='sub-btn'>Login</button>
            <button type='button' className='close-btn' onClick={onClose}>Cancel</button>
          </div>
          <div className='fp-container'>
            <p className='fp-agreement'>
              <a href='#' className='fp-link' onClick={(e) => {
                e.preventDefault();
                setDisplayfp(!displayfp);
              }}>
                Forgot Password?
              </a>
            </p>
          </div>
        </form>

        {message2 && (
          <p className={`reset-message ${message2 === "Login Successfully" ? "correct" : "incorrect"}`}>
            {message2}
          </p>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handlePassReset(); }}>
          {displayfp && (
            <div className="forgot-container">
              <input
                type="email"
                placeholder="Enter your email to reset password"
                onChange={(e) => setEmail(e.target.value)}
              />
              <button type="submit">Send Reset Link</button>
            </div>
          )}
        </form>

        {message && (
          <p className={`reset-message ${message === "Reset link sent!" ? "correct" : "incorrect"}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

export default SigninPopup;