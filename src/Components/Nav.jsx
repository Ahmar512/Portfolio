import React, { useState, useEffect } from 'react';
import { navLinks } from '../Constant';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import { Sparkles, FileText } from 'lucide-react';

const Nav = () => {
  const [flag, setFlag] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 30) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }

      // Track active section for indicator
      const sections = navLinks.map((link) => link.href.substring(1));
      const scrollPos = window.scrollY + 200;

      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleClick = () => {
    setFlag((prev) => !prev);
  };

  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 w-[92%] max-w-6xl z-50 transition-all duration-500">
      <nav
        className={`flex justify-between items-center px-6 py-3.5 rounded-full border transition-all duration-300 ${
          scrolled
            ? 'bg-slate-950/75 backdrop-blur-xl border-sky-500/30 shadow-[0_10px_30px_rgba(0,0,0,0.5)] shadow-sky-500/10'
            : 'bg-slate-900/50 backdrop-blur-md border-white/10 shadow-lg'
        }`}
      >
        {/* Brand Logo & Status */}
        <a href="#home" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-glow-cyan group-hover:scale-110 transition-transform">
            AA
          </div>
          <div className="flex flex-col">
            <span className="font-outfit font-bold text-lg tracking-tight text-white group-hover:text-sky-400 transition-colors">
              Ahmar<span className="text-sky-400">Ansari</span>
            </span>
            <span className="text-[10px] text-emerald-400 font-code flex items-center gap-1 -mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Open for Work
            </span>
          </div>
        </a>

        {/* Desktop Links */}
        <ul className="hidden lg:flex items-center gap-1 bg-slate-900/60 p-1.5 rounded-full border border-white/5">
          {navLinks.map((link) => {
            const sectionId = link.href.substring(1);
            const isActive = activeSection === sectionId;
            return (
              <li key={link.label}>
                <a
                  href={link.href}
                  className={`px-4 py-1.5 rounded-full text-sm font-jakarta font-medium transition-all duration-300 relative ${
                    isActive
                      ? 'text-sky-300 bg-sky-500/15 border border-sky-400/30 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </a>
              </li>
            );
          })}
        </ul>

        {/* CTA Button */}
        <div className="hidden lg:flex items-center gap-3">
          <a
            href="https://drive.google.com/file/d/14KnfbNmtSNi5VPRDWKdxaJ8deQWNdt68/view?usp=drive_link"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-glow-cyan hover:scale-105 active:scale-95 transition-all duration-300"
          >
            <FileText className="w-3.5 h-3.5" />
            Resume
          </a>
        </div>

        {/* Mobile Toggle */}
        <button
          onClick={handleClick}
          aria-label="Toggle Menu"
          className="lg:hidden p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors"
        >
          {flag ? <CloseIcon /> : <MenuIcon />}
        </button>
      </nav>

      {/* Mobile Dropdown */}
      {flag && (
        <div className="lg:hidden mt-3 p-5 rounded-3xl bg-slate-950/90 backdrop-blur-2xl border border-sky-500/30 shadow-2xl flex flex-col gap-3 animate-in slide-in-from-top-4 duration-300">
          <ul className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <li key={link.label}>
                <a
                  onClick={() => setFlag(false)}
                  href={link.href}
                  className="block px-4 py-2.5 rounded-xl font-jakarta text-slate-200 hover:text-sky-400 hover:bg-sky-500/10 border border-transparent hover:border-sky-500/20 transition-all"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="pt-2 border-t border-white/10">
            <a
              href="https://drive.google.com/file/d/14KnfbNmtSNi5VPRDWKdxaJ8deQWNdt68/view?usp=drive_link"
              target="_blank"
              rel="noreferrer"
              className="flex justify-center items-center gap-2 w-full py-3 rounded-xl font-jakarta font-semibold text-sm bg-gradient-to-r from-sky-500 to-indigo-600 text-white"
            >
              <FileText className="w-4 h-4" />
              Check Resume
            </a>
          </div>
        </div>
      )}
    </header>
  );
};

export default Nav;