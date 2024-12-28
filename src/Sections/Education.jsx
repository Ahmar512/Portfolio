import React from 'react'
import { SRMU, CPI } from '../assets/images'

const Education = () => {
  return (
    <section id='education' className='flex flex-col items-center'>
        <h1 className='text-center text-5xl font-bold font-palanquin'>Education</h1>
        <p className='text-center text-slate-300 mt-5 '>My education has been a journey of self-discovery and growth. My educationl detail are as follows</p>
        <div data-aos="fade-up" className='max-w-[840px] mt-7 bg-black p-5 rounded-xl border-[1px] border-blue-300'>
            <div>
                <img className='float-left mr-5 rounded-full' src={SRMU} alt="srmu" width={80} />
                <h1 className='font-bold text-lg font-palanquin leading-normal'>Shri Ramswaroop Memorial University, Lucknow </h1>
                <p className='text-sm font-bold font-palanquin'>Bachelor of Technology - <span className='text-slate-300 font-montserrat'>BTech, Computer Science and Engineering</span></p>
                <p className='text-sm font-montserrat text-slate-300'>July 2021 - Aug 2025</p>
            </div>
            <p className='mt-7 font-palanquin'><span className='font-bold'>Grade:</span> 7.99</p>
            <p className='mt-3 text-sm font-montserrat text-slate-300'>I am currently pursuing a Bachelor's degree in Compter Science and Engineering at Shri Ramswaroop Memorial University, Lucknow. I have completed 6 semesters and have a CGPA of 7.99. I have taken courses in Data Structures, Algorithm, MERN stack web development.</p>
        </div>
        <div data-aos="fade-up" className='max-w-[840px] mt-7 bg-black p-5 rounded-xl border-[1px] border-blue-300'>
            <div>
                <img className='float-left mr-5 rounded-lg' src={CPI} alt="srmu" width={80} />
                <h1 className='font-bold text-lg font-palanquin leading-normal'>Children Public Inter Collage Devgaon, Azamghar</h1>
                <p className='text-sm font-bold font-palanquin'>State Board(XII)</p>
                <p className='text-sm font-montserrat text-slate-300'>2020</p>
            </div>
            <p className='mt-7 font-palanquin'><span className='font-bold'>Grade:</span> 71%</p>
            <p className='mt-3 text-sm font-montserrat text-slate-300'>I completed my class 12 inter in 2020 at Children Public Inter Collage Devgaon, Azamghar. where I studied Science with Computer Application.</p>
        </div>
        <div data-aos="fade-up" className='max-w-[840px] mt-7 bg-black p-5 rounded-xl border-[1px] border-blue-300'>
            <div>
                <img className='float-left mr-5 rounded-lg' src={CPI} alt="srmu" width={80} />
                <h1 className='font-bold text-lg font-palanquin leading-normal'>Children Public Inter Collage Devgaon, Azamghar</h1>
                <p className='text-sm font-bold font-palanquin'>State Board(X)</p>
                <p className='text-sm font-montserrat text-slate-300'>2018</p>
            </div>
            <p className='mt-7 font-palanquin'><span className='font-bold'>Grade:</span> 80%</p>
            <p className='mt-3 text-sm font-montserrat text-slate-300'>I completed my class 10 high school in 2018 at Children Public Inter Collage Devgaon, Azamghar. where I studied Science with Computer Application.</p>
        </div>
    </section>
  )
}

export default Education