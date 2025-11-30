import React, { useState } from 'react'
import '../styles/ContactUs.css'
import contactImage from '../assets/contact-image.png'
import axios from 'axios';

const ContactUs = () => {
    const [displayContactForm, setDisplayContactForm] = useState(false);
    const [message, setMessage] = useState("");
    const handleSubmit = async (e) => { 
        e.preventDefault(); 

        const formData = {
        name: e.target[0].value,
        email: e.target[1].value,
        feedback: e.target[2].value
        };

        try {
        const res = await axios.post("http://localhost:5000/send-support", formData, {validateStatus: ()=> true});
        if (res.status === 200) {
            setMessage(res.data.message||"Support message sent!");
        } else {
            setMessage(res.data.message||"Failed to send message. Try again later.");
        }
        } catch (err) {
        console.error(err);
        setMessage("Server error, please try again.");
        }

        setTimeout(() => {
        setMessage("");
        setDisplayContactForm(false);
        }, 3000);
    }

  return (
    <div className='contactus' id='contactus'> 
            <h1>Contact Us</h1> 
            {!displayContactForm ? ( 
                <div className='contactus-container'> 
                    <div className='contactus-header'> 
                        <div className='contact-image'> 
                            <img src={contactImage} alt="" /> 
                        </div> 
                        <div className='header-content'> 
                            <p>Have questions or feedback?<br/>We're here to listen.</p> 
                            <button onClick={() => setDisplayContactForm(true)} className='contact-us-btn'>Contact Us</button> 
                        </div> 
                    </div> 
                </div> 
            ) : ( 
                <div className='contactus-form'> 
                    <h2>Feedback Are Welcome</h2> 
                    <form onSubmit={handleSubmit} className='form-container'> 
                        <input type="text" placeholder='First Name (optional)' /> 
                        <input type="Email" placeholder='Email' required /> 
                        <div className='text-area'> 
                            <textarea name="feedback" placeholder='Feedback' required></textarea> 
                        </div>
                        <div className='group-btns'>
                            <button type='submit' className='contact-us-send-btn'>Send</button> 
                            <button type='button' className='contact-us-cancel-btn' onClick={()=>setDisplayContactForm(false)}>Cancel</button>
                        </div> 
                    </form>
                    {message && <p className="support-message">{message}</p>}
                </div> 
            )} 
        </div> 
  )
}

export default ContactUs

// Ishmeal Gonzales {100%}