import React, { useState } from 'react'
import '../styles/Support.css'
import { MdOutlineTroubleshoot } from 'react-icons/md';
import { BiSupport } from 'react-icons/bi';
import { MdOutlineSupportAgent } from 'react-icons/md';
import { MdOutlinePolicy } from 'react-icons/md';
import { MdOutlineTipsAndUpdates } from 'react-icons/md';
import { PiDevicesBold } from 'react-icons/pi';


const Cards = [
    { icon: <BiSupport className='support-images-first' />, title: <h1>TrueRepair Support</h1>, content: <p>Welcome to the TrueRepair Support Center. Here you can find quick solutions to common questions, learn how to troubleshoot issues, and reach out to our team for further help. Whether you’re managing your account, fixing an error, or exploring our services, this page is designed to guide you every step of the way.</p> },
    { icon: <MdOutlineTroubleshoot className='support-images' />, title: <h1>Troubleshooting</h1>, content: <p>Having trouble? Check your internet and browser version. If images or tools aren’t loading, try refreshing or clearing your cache. Still need help? Click the <a href="/#contactus">Contact Us</a> link to reach our team — we’re happy to assist!</p> },
    { icon: <MdOutlineTipsAndUpdates className='support-images' />, title: <h1>Tips for Better Results</h1>, content: <p>To get the best results when using TrueRepair’s detection tools, make sure your uploaded images are clear and well-lit. Avoid blurry or cropped photos, and center the object you want to identify. Our system performs best with high-resolution images — following these tips helps improve accuracy and speed.</p> },
    { icon: <PiDevicesBold className='support-images' />, title: <h1>Devices & Browsers</h1>, content: <p>TrueRepair works on most modern devices and browsers. For the best experience, we recommend using Google Chrome, Microsoft Edge, or Safari on a desktop or laptop. Mobile users can access TrueRepair through the latest versions of Android and iOS browsers. Make sure your browser is up to date to ensure full compatibility with our features.</p> },
    { icon: <MdOutlinePolicy className='support-images' />, title: <h1>Policies & Security</h1>, content: <p>At TrueRepair, your data is safe. We use encrypted connections, secure authentication, and never share your information without your permission. Your privacy is always respected.</p> },
    { icon: <MdOutlineSupportAgent className='support-images' />, title: <h1>Contact Support</h1>, content: <p>We’re always improving TrueRepair, and your feedback helps us grow. If you have ideas for new features, design improvements, or better functionality, let us know! Use the <a href="/#contactus">feedback form</a> to share your thoughts — we read every message and consider user feedback in future updates.</p> },
];

const Support = ({ open, onClose }) => {
    const [index, setIndex] = useState(0);
    const displayCards = 3;
    const showCards = Cards.slice(index, index + displayCards);
    const nextPage = () => setIndex(current => Math.min(current + displayCards, Cards.length - displayCards));
    const previousPage = () => setIndex(current => Math.max(current - displayCards, 0));
    return (
        open && (
            <div className='support-overlay'>
                <div className='support-popup'>
                    <div className='support-title'>
                        <h1>Support</h1>
                        <p>Find quick answers, troubleshooting steps, and helpful resources.</p>
                    </div>
                    <div className='support-container'>
                        {showCards.map((card, i) => {
                            const mainIndex = index + i;
                            return (
                                <div className={`support-showcase ${mainIndex === 0 ? 'first-card' : ''}`} key={i}>
                                    {card.icon}
                                    {card.title}
                                    {card.content}
                                </div>
                            );
                        })}
                        {index > 0 && (
                            <button className="left-btn" onClick={previousPage}>◁</button>
                        )}
                        {index + displayCards < Cards.length && (
                            <button className="right-btn" onClick={nextPage}>▷</button>
                        )}
                    </div>
                    <div className='support-bottom'>
                        <button className='support-cancel-btn' onClick={onClose}>Cancel</button>
                    </div>
                </div>
            </div>
        )
    )
}

export default Support