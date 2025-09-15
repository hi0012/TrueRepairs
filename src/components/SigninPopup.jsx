import React from 'react'
import '../styles/SigninPopup.css'

const SigninPopup = ({open, onClose}) => {
  return open && (
    <div onClick={onClose} className='signin'>
        <div onClick={e => e.stopPropagation()} className='signin-form'> 
            <h3>Sign In</h3>
            <form>
                <input type="email"  placeholder='Email' required/>
                <input type="password"  placeholder='Password' required/>
                <button type='submit'>Login</button>
            </form>
            <button className='close-btn' onClick={onClose}>Close</button>
        </div>
    </div>
  )
}

export default SigninPopup