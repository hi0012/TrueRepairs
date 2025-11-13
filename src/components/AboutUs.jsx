import React from 'react'
import '../styles/AboutUs.css'
import AboutUsSideImage from '../assets/aboutus-image.png'

const AboutUs = () => {
    return (
        <div className='aboutus-parent' id='aboutus'>
            <h1>About Us</h1>
            <div className='aboutus'>
                <div className='aboutus-left'>
                    <img src={AboutUsSideImage} alt="" />
                </div>
                <div className='aboutus-right-container'>
                    <div className='aboutus-right-top-container'>
                        <div className='reason'>
                            <h2>Who We Are</h2>
                            <p>TrueRepairs was founded with a simple vision — to make car care less stressful and more accessible for everyone. We believe every driver should feel confident about the condition of their vehicle without being overwhelmed by technical jargon or hidden costs.</p>
                        </div>
                        <div className='purpose'>
                            <h2>Why We Exist</h2>
                            <p>Too often, auto repair feels confusing and intimidating. Our team set out to bridge the gap between everyday drivers and reliable repair knowledge by creating a platform that simplifies the process and puts the power back in your hands.</p>
                        </div>
                    </div>
                    <div className='aboutus-right-bottom'>
                        <div className='future'>
                            <h2>Looking Ahead</h2>
                            <p>TrueRepairs is more than a tool — it's a community resource built to grow with you. As we continue to expand, our goal is to bring even more innovation and support to drivers everywhere, ensuring that car ownership feels less like a burden and more like freedom.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AboutUs