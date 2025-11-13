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
  const [messageType, setMessageType] = useState('success');

  useEffect(()=> {
    requestAnimationFrame(()=>
      document.getElementById(location.hash?.slice(1))?.scrollIntoView({behavior: "smooth"})
    )
  }, [location.pathname, location.hash])

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const verified = params.get('verified');
    const deleted = params.get('deleted');

    if (verified === 'true') {
      setMessage('Your account has been verified!');
    } else if (verified === 'false') {
      setMessage('Verification failed or expired.');
    } else if (verified === 'exists') {
      setMessage('Account already verified.');
    } else if (deleted === 'true') {
      setMessage('Your account has been successfully deleted.');
    }

    if (verified || deleted) {
      setTimeout(() => setMessage(''), 4000);
    }
  }, [location]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const emailUpdateStatus = params.get('email-update');
    const newEmail = params.get('newEmail');

    // Check *only* for the email update parameters
    if (emailUpdateStatus === 'success' && newEmail) {
      setMessage('Your email has been successfully updated!');
      setMessageType('success'); // Set color to green

      // Update localStorage so the app reflects the change
      try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
          user.email = newEmail;
          localStorage.setItem('user', JSON.stringify(user));
        }
      } catch (e) {
        console.error("Failed to update user in localStorage", e);
      }
      
      // After 4 seconds, reload the page to show new data
      const timer = setTimeout(() => {
        setMessage('');
        //window.location.href = '/'; // Navigate to root (clears URL, reloads app)
      }, 4000);
      
      return () => clearTimeout(timer); // Cleanup timer

    } else if (emailUpdateStatus === 'failed') {
      setMessage('Failed to update email. The link may have expired.');
      setMessageType('error'); // Set color to red
      
      // After 4 seconds, clear message and URL
      const timer = setTimeout(() => {
        setMessage('');
        window.history.replaceState({}, document.title, "/"); // Just clear URL
      }, 4000);
      
      return () => clearTimeout(timer); // Cleanup timer
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
