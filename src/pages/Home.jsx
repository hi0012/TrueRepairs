import React from 'react'
import '../styles/Home.css'
import Header from '../components/Header'
import Features from '../components/Features'
import AboutUs from '../components/AboutUs'
import ContactUs from '../components/ContactUs'

const Home = () => {
  return (
    <div>
        <Header/>
        <Features/>
        <AboutUs/>
        <ContactUs/>
    </div>
  )
}

export default Home