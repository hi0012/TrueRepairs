import React, { useEffect } from 'react'
import '../styles/RegisterPopup.css'
import { useState } from 'react';
import { Link } from "react-router-dom";
import axios from 'axios'

const RegisterPopup = ({open, onClose}) => {

  const [firstName, setFirstName] = useState()
  const [lastName, setLastName] = useState()
  const [email, setEmail] = useState()
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState()

  const handleSubmit = (e) => {
      e.preventDefault()
      axios.post('http://localhost:3000/register', {firstName, lastName, email, password, passwordConfirm})
      .then(result => console.log(result))
      .catch(err=> console.log(err))
  }

  useEffect(()=> {
    if(!open) {
      setPassword('');
    }
  }, [open]);

  const passwordReq = {
    length: password.length >= 8,
    specialChar: /[0-9!@#$%^&*().]/.test(password),
    lowCase: /[a-z]/.test(password),
    highCase: /[A-Z]/.test(password),
  };

  const passwordReqChecker = passwordReq.length && passwordReq.lowCase && passwordReq.specialChar && passwordReq.highCase;

  const passwordWarning = password.length > 0 && !passwordReqChecker;

  return open && (
    <div onClick={onClose} className='register'>
        <div onClick={e => e.stopPropagation()} className='register-form'> 

            <h3>Create an Account</h3>
            <form onSubmit={handleSubmit}>
                <div className='form-names'>
                  <input type="text" placeholder='First Name' required onChange={(e) => setFirstName(e.target.value)}/>
                <input type="text" placeholder='Last Name' required onChange={(e) => setLastName(e.target.value)}/>
                </div>
                <input type="email"  placeholder='Email Address' required onChange={(e) => setEmail(e.target.value)}/>
                <input type="password"  placeholder='Password' required onChange={(e) => setPassword(e.target.value)}/>
                <input type="password"  placeholder='Confirm Password' required onChange={(e) => setPasswordConfirm(e.target.value)}/>
                {passwordWarning && (
                  <ul className='password-validator'>
                  {!passwordReq.length && <li>Must be at least 8 characters long</li>}
                  {!passwordReq.lowCase && <li>Must have at least one lowercase letter</li>}
                  {!passwordReq.highCase && <li>Must have at least one uppercase letter</li>}
                  {!passwordReq.specialChar && <li>Must have at least one special character</li>}
                </ul>
                )}
                <div className='forms-btns'>
                  <button type='submit' disabled={!passwordReqChecker}>Create Account</button>
                  <button type='close' onClick={onClose}>Close</button>
                </div>
            </form>
        </div>
    </div>
  )
}

export default RegisterPopup