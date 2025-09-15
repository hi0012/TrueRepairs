import React from 'react'
import '../styles/RegisterPopup.css'

const RegisterPopup = ({open, onClose}) => {
  return open && (
    <div onClick={onClose} className='register'>
        <div onClick={e => e.stopPropagation()} className='register-form'> 
            <h3>Create an Account</h3>
            <form>
              <div className='form-name'>
                <input type="text" placeholder='First Name' required/>
                <input type="text" placeholder='Last Name' required />
              </div>
                <input type="email"  placeholder='Email Address' required/>
                <input type="password"  placeholder='Password' required/>
                <input type="password"  placeholder='Confirm Password' required/>
                <div className='form-btns'>
                  <button type='submit'>Create Account</button>
                  <button type='close' className='close-btn' onClick={onClose}>Close</button>
                </div>
            </form>
        </div>
    </div>
  )
}

export default RegisterPopup