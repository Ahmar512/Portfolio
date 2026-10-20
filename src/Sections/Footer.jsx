import React from 'react';
import { navLinks, socialsIcons } from '../Constant';
import Social from '../Components/Social';
import { Heart } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="w-full bg-slate-950/80 border-t border-white/10 py-10 px-6 relative z-10">
      <div className="max-w-6xl mx-auto flex flex-col items-center gap-6">
        
        {/* Brand */}
        <a href="#home" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-glow-cyan group-hover:scale-110 transition-transform">
            AA
          </div>
          <span className="font-outfit font-bold text-xl tracking-tight text-white group-hover:text-sky-400 transition-colors">
            Ahmar<span className="text-sky-400">Ansari</span>
          </span>
        </a>

        {/* Quick Nav Links */}
        <ul className="flex flex-wrap justify-center gap-6 font-jakarta text-sm text-slate-400">
          {navLinks.map((nav, index) => (
            <li key={index}>
              <a
                href={nav.href}
                className="hover:text-sky-300 transition-colors duration-300"
              >
                {nav.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Social Icons Bar */}
        <div className="flex gap-4">
          {socialsIcons.map((social, index) => (
            <Social key={index} Icon={social.icon} href={social.href} />
          ))}
        </div>

        {/* Copyright */}
        <div className="text-xs font-jakarta text-slate-400 border-t border-white/5 pt-6 w-full text-center flex flex-col sm:flex-row items-center justify-center gap-2">
          <span>© {new Date().getFullYear()} Ahmar Ansari. All rights reserved.</span>
          <span className="hidden sm:inline">•</span>
          <span className="flex items-center gap-1">
            Built with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" /> React & GSAP
          </span>
        </div>

      </div>
    </footer>
  );
};

export default Footer;