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
  const [displayToS, setDisplayToS] = useState(false);
  const [message, setMessage] = useState("");

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
                <input type="email"  placeholder='Email' required onChange={(e) => setEmail(e.target.value)}/>
                <input type="password"  placeholder='Password' required onChange={(e) => setPassword(e.target.value)}/>
                <div className='forms-btns'>
                  <button type='submit'>Login</button>
                  <button type='button' className='close-btn' onClick={onClose}>Close</button>
                </div>
                <div className='tos-container'>
                  <p className='tos-forgot'><a href='#' className='tos-link' onClick={(e) => {
                    e.preventDefault();
                    setDisplayToS(!displayToS);
                  }}>Forgot Password?</a></p>
                  {displayToS && (
                    <div className='tos-inline-box' onClick={() => setDisplayToS(false)}>
                          <form onSubmit={handleSubmit}>
                            <h3>Forgot Password</h3>
                            <input
                              type="email"
                              placeholder="Enter your email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              required
                            />
                            <button type="submit">Send Reset Link</button>
                            <p>{message}</p>
                          </form>
                    </div>
                  )}
                </div>
            </form>
        </div>
    </div>
  )
}

export default SigninPopup