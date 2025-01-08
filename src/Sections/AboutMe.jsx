import React from 'react'
import { ahmar } from '../assets/images'
import Button from '../Components/Button'

const AboutMe = () => {
    const handleClick = () =>{
        window.location.href='https://drive.google.com/file/d/1Hnum4lDRfMUlSZNkZNibRztccCVRIIV0/view?usp=sharing';
    }
  return (
    <section id='aboutMe' className='flex flex-col'>
        <h1 className='font-palanquin font-bold text-center text-5xl py-2'>About <span className='text-blue-300'>Me</span></h1>
        
        <div data-aos="fade-up" className='flex max-lg:flex-col bg-black rounded-3xl my-5'>
            <div className='w-[40%] max-lg:w-full flex justify-center items-center py-10'>
                
                <img className='rounded-xl hover:scale-110 transition-transform' src={ahmar} alt="ahmar pic" height={310} width={230}/>
                
            </div>
            <div className='w-[60%] max-lg:w-full flex justify-center flex-col p-5'>
                <h1 className=' font-palanquin text-4xl font-bold'>I'm Ahmar Ansari</h1>
                <p className='font-bold text-blue-300 mt-5 font-palanquin'>Frontend Developer</p>
                <p className='font-montserrat mt-5 leading-normal  text-slate-300'>Hi, I'm Ahmar Ansari, a passionate web developer with a knack for creating dynamic and visually appealing websites. With a strong background in front-end development, I specialize in HTML, CSS, and JavaScript, ensuring a seamless user experience. I thrive on turning complex problems into simple, beautiful solutions and have solved numerous challenges on LeetCode to sharpen my problem-solving skills. My portfolio showcases a variety of projects that demonstrate my expertise and creativity. I'm always eager to learn new technologies and take on exciting challenges. Let's create something amazing together!</p>
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