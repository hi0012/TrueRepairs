import React, { useState } from 'react'
import '../styles/Header.css'
import RegisterPopup from './RegisterPopup'

const Header = () => {
  const [registerOpen, setRegisterOpen] = useState(false);
  return (
    <div className='header'>
        <div className='header-info'>
            <div className='header-left'>
                <button onClick={()=>setRegisterOpen(true)}>Get Started</button> 
            </div>
            <div className='header-right'>
               <h2>Get <span className='test'>accurate</span> car repair cost estimates in seconds.</h2>
                <p>At TrueRepairs, we use advanced AI and trusted automotive databases to give you instant repair cost estimates. Simply upload a photo of your car or enter its details, and we'll analyze the damage, identify the parts, and provide a fair cost range. Create a free account to save your reports, track past repairs, and take control of your car maintenance.</p>
            </div>
        </div>
        <RegisterPopup open={registerOpen} onClose={() => setRegisterOpen(false)} />
    </div>
  )
}

export default Header