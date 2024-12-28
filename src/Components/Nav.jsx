import React, { useState } from 'react';
import { navLinks } from '../Constant';
import MenuIcon from '@mui/icons-material/Menu';

const Nav = () => {
    const [flag, setFlag] = useState(false);
    const handleClick = () =>{
        setFlag(preValue => !preValue);
    }
  return (
    <header className='px-10 py-4 absolute w-full max-sm:px-5'>
        <nav className='flex justify-between items-center'>
            <a href="/"><h1 className='text-2xl font-bold  font-palanquin'>Ahmar Ansari</h1></a>
            <ul className='flex flex-1 justify-center items-center gap-12 max-lg:hidden font-montserrat text-slate-300'>
                {navLinks.map((link)=>(
                    <li key={link.label}><a className='hover:text-blue-300 transition-colors' href={link.href}>{link.label}</a></li>
                ))}
            </ul>
            <div onClick={handleClick} className='lg:hidden'>
                <MenuIcon />
            </div>
        </nav>
        {flag ? <ul className='flex flex-col gap-2 items-center absolute right-0 w-40 mt-2 lg:hidden font-montserrat text-slate-300'>
                {navLinks.map((link)=>(
                    <li className='text-center' key={link.label}><a className='hover:text-blue-300 transition-colors ' href={link.href}>{link.label}</a></li>
                ))}
            </ul>: null}
    </header>
  )
}

export default Nav