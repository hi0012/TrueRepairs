import React from 'react'
import '../styles/HrDivider.css'
import hrImage from '../assets/hr-middle-image.jpeg'

const HrDivider = () => {
    return (
        <div className='section-div'>
            <hr />
            <img className='div-middle-logo' src={hrImage} alt="" />
            <hr />
        </div>
    )
}

export default HrDivider

// Ishmeal Gonzales {100%}