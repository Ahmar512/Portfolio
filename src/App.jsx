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
      <section className='px-20 py-5 max-sm:px-2'>
        <Projects />
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