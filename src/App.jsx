import { useEffect, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import Hero from './Sections/Hero';
import Skills from './Sections/Skills';
import Nav from './Components/Nav';
import AboutMe from './Sections/AboutMe';
import Projects from './Sections/Projects';
import Education from './Sections/Education';
import ContactUs from './Sections/ContactUs';
import Footer from './Sections/Footer';
import axios from 'axios';
import { MoveRight } from 'lucide-react';
function App() {
  
  return (
    <main>
      <Nav />
      <section className='sm:min-h-screen w-full px-40 py-4 max-sm:px-2 max-sm:h-fit'>
        <Hero />
      </section>
      <section className='px-20 py-5 max-lg:px-2'>
        <AboutMe />
      </section>
      <section className='px-14 py-5 w-full max-sm:px-3'>
        <Skills />
      </section>
      <section className='px-20 py-5 max-sm:px-2 relative'>
        <Projects />
        
        <div className=' absolute right-0 top-[50%] flex flex-col justify-center items-center '>
              <div className='bg-slate-100/50 size-14 flex items-center justify-center rounded-full'>
                <MoveRight className=' size-6' />
              </div>
              <p>Scroll right</p>
        </div>
        
        
      </section>
      <section className='px-20 py-5 max-sm:px-2'>
        <Education />
      </section>
      <section>
        <Footer />
      </section>
    </main>
  )
}
export default App