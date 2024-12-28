import React from 'react'
import { role } from '../Constant'
import gsap from 'gsap'
import { useState, useEffect } from 'react'
import { heroImg } from '../assets/images'
import Button from '../Components/Button'
import { socialsIcons } from '../Constant'
import Social from '../Components/Social'
import { useGSAP } from '@gsap/react'

const Hero = () => {
  const [text, setText] = useState('Developer');
  const [index, setIndex] = useState(0);
  useEffect(()=>{
    let interval = setInterval(update, 3000);
    return ()=> clearInterval(interval);
  },[index]);
  function update(){
    setIndex(Math.floor(Math.random()*role.length));
    setText(role[index]);
    gsap.from('#text',{
      delay:0.5,
      duration:1,
      opacity:0,
    })
    console.log(index);
  }
  useGSAP(()=>{
    gsap.from('#name',{
      delay:0.5,
      opacity:0,
      rotateX:-360,
      duration:2,
      stagger:0.1,
      ease:"back.out"
    })
  },[])
  return (
    <section className='flex max-lg:flex-col'>
        <div className='w-[50%] flex justify-center flex-col max-lg:w-full sm:min-h-screen min-h-[800px]'>
          <h1 className='text-6xl leading-[70px] font-bold flex max-sm:text-5xl font-palanquin'>Hi There, <br /> I'm </h1>
            <h1 className='text-6xl leading-[70px] font-bold flex max-sm:text-5xl font-palanquin'>Ahmar<span className='text-blue-300 flex ml-3'>
            <p id='name'>A</p>
            <p id='name'>n</p>
            <p id='name'>s</p>
            <p id='name'>a</p>
            <p id='name'>r</p>
            <p id='name'>i</p>
          </span>
          </h1>
          <p className='text-2xl mt-7 font-montserrat'>I am a <span id='text' className='text-blue-300 font-bold' >{text}</span></p>
          <div className='mt-10'>
            <a className='bg-blue-500 px-5 py-3 rounded-xl font-bold text-lg hover:bg-blue-600 transition-colors font-montserrat' href="#aboutMe">About Me</a>
          </div>
          <div className='flex gap-5 mt-10'>
            {socialsIcons.map((social, index)=>(
                <Social
                  key={index}
                  Icon = {social.icon}
                  href = {social.href}
                 />
            ))}
          </div>
        </div>
        <div className='w-[50%] flex justify-center items-center py-5 max-lg:hidden'>
          <img src={heroImg} alt="image" height={350} width={350} />
        </div>
    </section>
  )
}

export default Hero