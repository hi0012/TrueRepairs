import React, { useState } from 'react'
import Navbar from './components/Navbar'
import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import SigninPopup from './components/SigninPopup'
import Footer from './components/Footer'



const App = () => {
  const [signInActive, setSignInActive] = useState(false);
  return (
    <div>
      {signInActive?<SigninPopup/>:<></>}
      <div className='site'>
        <Navbar setSignInActive={setSignInActive}/>
        <Routes>
          <Route path='/' element={<Home />} />
        </Routes>
      </div>
      <Footer/>
    </div>

  )
}

export default App