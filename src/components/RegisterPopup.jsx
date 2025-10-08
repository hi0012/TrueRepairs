import React, { useEffect } from 'react'
import '../styles/RegisterPopup.css'
import { useState } from 'react';
import axios from 'axios'
import { RiErrorWarningLine } from 'react-icons/ri';
import { FaCheckCircle } from 'react-icons/fa';

const RegisterPopup = ({open, onClose}) => {

  const [email, setEmail] = useState()
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [displayToS, setDisplayToS] = useState(false);
  
  const [clickPassword, setClickPassword] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = (e) => {
  e.preventDefault();

  axios.post("http://localhost:3000/register", {
    email, password, passwordConfirm
  })
  .then((res) => {
    if (!res.data.success) {
      setMessage(res.data.message || "Registration failed.");
      setTimeout(() => setMessage(""), 3000);
    } else {
      setMessage(res.data.message || "Verification email sent!");
      setTimeout(() => {
        setMessage("");
        onClose();
      }, 3000);
    }
  })
  .catch((err) => {
    console.error(err);
    setMessage("Error connecting to server");
    setTimeout(() => setMessage(""), 2000);
  });
  }

  useEffect(()=> {
    if(!open) {
      setPassword('');
      setPasswordConfirm('');
      setClickPassword(false);
      setMessage("");
    }
  }, [open]);

  const passwordReq = {
    length: password.length >= 8,
    number: /[0-9]/.test(password),
    specialChar: /[!@#$%^&*().]/.test(password),
    lowCase: /[a-z]/.test(password),
    highCase: /[A-Z]/.test(password),
  };

  const passwordReqChecker = passwordReq.length && passwordReq.lowCase && passwordReq.specialChar && passwordReq.highCase;

  const passwordWarning = password.length > 0 && !passwordReqChecker;

  const passwordEqual = password === passwordConfirm;

  return open && (
    <div onMouseDown={(e) => { if (e.target === e.currentTarget) { onClose(); } }} className='register'>
        <div onClick={e => e.stopPropagation()} className='register-form'> 

            <h3>Create an Account</h3>
            <form onSubmit={handleSubmit}>
                <div className='form-names'>
                </div>
                <input type="email"  placeholder='Email Address' required onChange={(e) => setEmail(e.target.value)}/>
                <input type="password"  placeholder='Password' required onChange={(e) => {setPassword(e.target.value); setClickPassword(true);}}/>
                <input type="password"  placeholder='Confirm Password' required onChange={(e) => setPasswordConfirm(e.target.value)}/>
                { clickPassword && (
                  <ul className='password-validator'>
                  <li className={passwordReq.length ? "correct" : "incorrect"}>{passwordReq.length ? <FaCheckCircle/> : <RiErrorWarningLine/>} At least 8 characters long</li>
                  <li className={passwordReq.lowCase ? "correct" : "incorrect"}>{passwordReq.lowCase ? <FaCheckCircle/> : <RiErrorWarningLine/>} At least 1 lowercase letter (a-z)</li>
                  <li className={passwordReq.highCase ? "correct" : "incorrect"}>{passwordReq.highCase ? <FaCheckCircle/> : <RiErrorWarningLine/>} At least 1 uppercase letter (A-Z)</li>
                  <li className={passwordReq.number ? "correct" : "incorrect"}>{passwordReq.number ? <FaCheckCircle/> : <RiErrorWarningLine/>} At least 1 number (0-9)</li>
                  <li className={passwordReq.specialChar ? "correct" : "incorrect"}>{passwordReq.specialChar ? <FaCheckCircle/> : <RiErrorWarningLine/>} At least 1 special character (@ # $ % ^ &)</li>
                </ul>
                )}
                {passwordConfirm.length > 0 && (
                  <p className={passwordEqual ? "password-equal" : "password-mismatch"}>{passwordEqual ? (
                    <>
                      <FaCheckCircle/> Passwords match.
                    </>
                  ): (
                    <>
                      <RiErrorWarningLine/> Passwords don't match.
                    </>
                  )}</p>
                )}
                {message && (
                  <p
                    className={`reset-message ${
                      message.toLowerCase().includes("verification email") ||
                      message.toLowerCase().includes("success") ||
                      message.toLowerCase().includes("check your inbox")
                        ? "correct"
                        : "incorrect"
                    }`}
                  >
                    {message}
                  </p>
                )}
                <div className='forms-btns'>
                  <button type='submit' disabled={!passwordReqChecker || !passwordEqual}>Create Account</button>
                  <button type='close' onClick={onClose}>Cancel</button>
                </div>
                <div className='tos-container'>
                  <p className='tos-agreement'>By creating this account, you agree to our <a href='#' className='tos-link' onClick={(e) => {
                    e.preventDefault();
                    setDisplayToS(!displayToS);
                  }}>Terms of Service</a></p>
                  {displayToS && (
                    <div className='tos-inline-box' onClick={() => setDisplayToS(false)}>
                      <p>When you register for an account, you agree to use our site in a lawful and respectful manner. You are responsible for keeping your login information secure and for any actions taken under your account. Misuse of the site—such as attempting unauthorized access, sharing harmful material, or disrupting the experience of other users—is strictly prohibited.<br/><br/>We may suspend or remove accounts that break these Terms of Service. These Terms may be updated periodically, and by continuing to use the site after changes are posted, you agree to the revised terms.<br/><br/> If you do not accept these Terms, please do not create an account or use this service.</p>
                      <p className='tos-update'>Last update: 09/19/2025</p>
                    </div>
                  )}
                </div>
            </form>
        </div>
    </div>
  )
}

export default RegisterPopup