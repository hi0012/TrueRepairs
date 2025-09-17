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
    <div onClick={onClose} className='signin'>
        <div onClick={e => e.stopPropagation()} className='signin-form'> 
            <h3>Sign In</h3>
            <form onSubmit={handleSubmit}>
                <input type="email"  placeholder='Email' required onChange={(e) => setEmail(e.target.value)}/>
                <input type="password"  placeholder='Password' required onChange={(e) => setPassword(e.target.value)}/>
                <div className='forms-btns'>
                  <button type='submit'>Login</button>
                  <button type='close' className='close-btn' onClick={onClose}>Close</button>
                </div>
            </form>
        </div>
    </div>
  )
}

export default SigninPopup