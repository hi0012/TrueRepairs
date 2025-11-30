import React, { useEffect, useState } from 'react'
import '../styles/ReturnToTopButton.css'
import topButton from '../assets/scrollup.png'

const ReturnToTopButton = () => {
    const [displayButton, setDisplayButton] = useState(false);
    const [buttonPosition, setButtonPosition] = useState("20px");

    const goToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth" 
        });
    };

    useEffect(() => {
        const controlScrollButton = () => {
            setDisplayButton(window.scrollY > 100);

            const position = window.scrollY + window.innerHeight;
            const height = document.body.scrollHeight;

            setButtonPosition(position > height - 190 ? "250px" : "20px");
        };

        window.addEventListener("scroll", controlScrollButton);
        return () => {
            window.removeEventListener("scroll", controlScrollButton);
        }
    }, []);

    
    return (
        displayButton && (
            <div className="return-to-top-button-container" style={{bottom: buttonPosition}}>
                <img className="return-to-top-image" src={topButton} onClick={goToTop}/>
            </div>
        )
    )
}

export default ReturnToTopButton

// Ishmeal Gonzales {100%}