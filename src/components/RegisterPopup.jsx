import React from 'react'
import '../styles/RegisterPopup.css'

const RegisterPopup = ({open, onClose}) => {
  return open && (
    <div onClick={onClose} className='register'>
        <div onClick={e => e.stopPropagation()} className='register-form'> 
            <h3>Create Account</h3>
            <form>
                <input type="text" placeholder='FirstName' required/>
                <input type="text" placeholder='LastName' required />
                <input type="email"  placeholder='Email' required/>
                <input type="password"  placeholder='Password' required/>
                <input type="password"  placeholder='Password' required/>
                <button type='submit'>Submit</button>
            </form>
            <button className='close-btn' onClick={onClose}>Close</button>
        </div>
    </div>
  )
}

export default RegisterPopup