import React from 'react'
import '../styles/SigninPopup.css'
import { useState } from 'react';
import { Link } from "react-router-dom";
import axios from 'axios'

const SigninPopup = ({open, onClose}) => {

  const [email, setEmail] = useState()
  const [password, setPassword] = useState()

  const handleSubmit = (e) => {
      e.preventDefault()
      axios.post('http://localhost:3000/login', {email, password})
      .then(result => console.log(result))
      .catch(err=> console.log(err))
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