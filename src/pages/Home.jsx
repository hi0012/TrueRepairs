import React from 'react'
import '../styles/Home.css'
import Header from '../components/Header'
import Features from '../components/Features'
import AboutUs from '../components/AboutUs'

const Home = () => {
  return (
    <div>
        <Header/>
        <Features/>
        <AboutUs/>
    </div>
  )
}

export default Home