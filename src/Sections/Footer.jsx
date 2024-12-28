import React from 'react'
import { navLinks } from '../Constant'
import { socialsIcons } from '../Constant'
import Social from '../Components/Social'
const Footer = () => {
  return (
    <footer className='flex flex-col items-center py-5 gap-5 bg-black'>
        <h1 className='text-xl text-blue-300 font-bold font-montserrat'>Ahmar Ansari</h1>
        <ul className='flex gap-5 font-montserrat flex-wrap justify-center '>
            {navLinks.map((nav, index)=>(
                <li key={index}><a href={nav.href}>{nav.label}</a></li>
            ))}
        </ul>
        <div className='flex gap-5'>
            {socialsIcons.map((social, index)=>(
                <Social
                    key={index} 
                    Icon = {social.icon}
                    href = {social.href}
                />
            ))}
        </div>
        <p>@ 2023 Ahmar Ansari. All rights reserved.</p>
    </footer>
  )
}

export default Footer