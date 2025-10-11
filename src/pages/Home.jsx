import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import '../styles/Home.css';
import Header from '../components/Header';
import Features from '../components/Features';
import AboutUs from '../components/AboutUs'
import ContactUs from '../components/ContactUs'
import ReturnToTopButton from '../components/ReturnToTopButton'


const Home = () => {
  const location = useLocation();
  const [message, setMessage] = useState('');

  useEffect(()=> {
    requestAnimationFrame(()=>
      document.getElementById(location.hash?.slice(1))?.scrollIntoView({behavior: "smooth"})
    )
  }, [location.pathname, location.hash])

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const verified = params.get('verified');

    if (verified === 'true') {
      setMessage('Your account has been verified!');
    } else if (verified === 'false') {
      setMessage('Verification failed or expired.');
    } else if (verified === 'exists') {
      setMessage('Account already verified.');
    }

    if (verified) {
      setTimeout(() => setMessage(''), 4000);
    }
  }, [location]);

  return (
    <div className="home-container">
      {message && (
        <div className="verify-toast">
          {message}
        </div>
      )}
      <Header />
      <Features />
      <AboutUs/>
      <ContactUs/>
      <ReturnToTopButton/>
    </div>
  );
};

export default Home;
