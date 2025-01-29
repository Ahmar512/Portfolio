import React from 'react'
import { ahmar } from '../assets/images'
import Button from '../Components/Button'

const AboutMe = () => {
    const handleClick = () => {
        window.location.href = 'https://drive.google.com/file/d/14KnfbNmtSNi5VPRDWKdxaJ8deQWNdt68/view?usp=drive_link';
    }
    return (
        <section id='aboutMe' className='flex flex-col'>
            <h1 className='font-palanquin font-bold text-center text-5xl py-2'>About <span className='text-blue-300'>Me</span></h1>

            <div data-aos="fade-up" className='flex max-lg:flex-col bg-black rounded-3xl my-5'>
                <div className='w-[40%] max-lg:w-full flex justify-center items-center py-10'>

                    <img className='rounded-xl hover:scale-110 transition-transform' src={ahmar} alt="ahmar pic" height={310} width={230} />

                </div>
                <div className='w-[60%] max-lg:w-full flex justify-center flex-col p-5'>
                    <h1 className=' font-palanquin text-4xl font-bold'>I'm Ahmar Ansari</h1>
                    <p className='font-bold text-blue-300 mt-5 font-palanquin'>Full Stack Developer</p>
                    <p className='font-montserrat mt-5 leading-normal  text-slate-300'>👋 Hi, I'm Ahmar, a dedicated Software Developer with a strong foundation in Java, Data Structures & Algorithms. Currently in my final year of B.Tech in Computer Science, I have solved 500+ problems on LeetCode, sharpening my problem-solving and analytical skills.
                        <br />
                        
                        I have hands-on experience in full-stack development, working with ReactJS, Tailwind CSS, Node.js, and databases, and have built several projects, including an Real-Time Chat application, Authentication System with OTP & JWT security, and a medicine info hub.
                        <br />

                        I thrive on solving complex challenges and building efficient, scalable applications. Currently, I am seeking a Software Development Engineer (SDE) role where I can apply my skills to real-world problems and contribute to impactful software solutions.
                        <br />

                        🚀 Let’s connect and build the future together!</p>
                    <div className='my-10'>
                        <button className='bg-blue-500 px-5 py-2 rounded-xl font-bold text-lg hover:bg-blue-600 transition-colors font-montserrat' onClick={handleClick}>
                            Check Resume
                        </button>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default AboutMe