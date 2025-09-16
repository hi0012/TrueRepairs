import React from 'react'
import '../styles/RegisterPopup.css'
import { useState } from 'react';
import { Link } from "react-router-dom";
import axios from 'axios'

const RegisterPopup = ({open, onClose}) => {

  const [firstName, setFirstName] = useState()
  const [lastName, setLastName] = useState()
  const [email, setEmail] = useState()
  const [password, setPassword] = useState()
  const [passwordConfirm, setPasswordConfirm] = useState()

  const handleSubmit = (e) => {
      e.preventDefault()
      axios.post('http://localhost:3000/register', {firstName, lastName, email, password, passwordConfirm})
      .then(result => console.log(result))
      .catch(err=> console.log(err))
  }

  return open && (
    <div onClick={onClose} className='register'>
        <div onClick={e => e.stopPropagation()} className='register-form'> 
            <h3>Create Account</h3>
            <form onSubmit={handleSubmit}>
                <input type="text" placeholder='FirstName' required onChange={(e) => setFirstName(e.target.value)}/>
                <input type="text" placeholder='LastName' required onChange={(e) => setLastName(e.target.value)}/>
                <input type="email"  placeholder='Email' required onChange={(e) => setEmail(e.target.value)}/>
                <input type="password"  placeholder='Password' required onChange={(e) => setPassword(e.target.value)}/>
                <input type="password"  placeholder='Password' required onChange={(e) => setPasswordConfirm(e.target.value)}/>
                <button type='submit'>Submit</button>
            </form>
            <button className='close-btn' onClick={onClose}>Close</button>
        </div>
    </div>
  )
}

export default RegisterPopup