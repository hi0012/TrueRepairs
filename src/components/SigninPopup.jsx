import React from 'react'
import '../styles/SigninPopup.css'
import { useState } from 'react';
import { Link } from "react-router-dom";
import axios from 'axios'
import { useNavigate } from "react-router-dom";


const SigninPopup = ({open, onClose}) => {

  const [email, setEmail] = useState()
  const [password, setPassword] = useState()
  const navigate = useNavigate();
  const [displayfp, setDisplayfp] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();

    axios.post("http://localhost:3000/login", { email, password })
    .then((res) => {
      console.log(res.data);

      if (res.data.success) {
        // Grabbing info from DB to store in local storage and redirect to dashboard
        localStorage.setItem("user", JSON.stringify(res.data.user));
        onClose();
        navigate("/dashboard");
      } else {
        alert("Invalid Login Credentials");
      }
    })
    .catch((err) => {
       console.error(err);
      alert("Error connecting to server");
    });
  }

  return open && (
    <div onMouseDown={(e) => { if (e.target === e.currentTarget) { onClose(); } }} className='signin'>
        <div onClick={e => e.stopPropagation()} className='signin-form'>
          <h3>Sign In</h3>
          <form onSubmit={handleSubmit}>
            <input type="email"  placeholder='Email' required={!displayfp} onChange={(e) => setEmail(e.target.value)}/>
            <input type="password"  placeholder='Password' required={!displayfp} onChange={(e) => setPassword(e.target.value)}/>
            <div className='forms-btns'>
              <button type='submit'>Login</button>
              <button type='button' className='close-btn' onClick={onClose}>Close</button>
            </div>
            <div className='fp-container'>
              <p className='fp-agreement'><a href='#' className='fp-link' onClick={(e) => {
              e.preventDefault();
              setDisplayfp(!displayfp);
              }}>Forgot Password?</a></p>
            </div>
            {/* Forgot Password inline form--Robert*/}
            {displayfp && (
              <div className='forgot-container'>
                <input type="email" placeholder="Enter your email to reset password" onChange={(e) => setEmail(e.target.value)}/>
                <button type="submit" onClick={() => {
                  if (!email) {
                    alert("Please enter your email first.");
                    return;
                  }
                  axios.post("http://localhost:3000/forgot-password", { email })
                  .then((res) => alert(res.data.message || "Reset link sent!"))
                  .catch((err) => {
                      console.error(err);
                      alert("Error sending reset request.");
                  });
                }}>Send Reset Link</button>
              </div>
            )}
          </form>
        </div>
    </div>
  )
}

export default SigninPopup