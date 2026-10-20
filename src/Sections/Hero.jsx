import React, { useState, useEffect, useRef } from 'react';
import { role } from '../Constant';
import gsap from 'gsap';
import { heroImg } from '../assets/images';
import Social from '../Components/Social';
import { socialsIcons } from '../Constant';
import { useGSAP } from '@gsap/react';
import { Code2, Trophy, GraduationCap, ArrowUpRight, Sparkles, Terminal } from 'lucide-react';

const Hero = () => {
  const [textIndex, setTextIndex] = useState(0);
  const nameRef = useRef(null);
  const heroRoles = ["Full Stack Developer", "Problem Solver (500+ LeetCode)", "MERN Stack Specialist", "Software Engineer"];

  useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % heroRoles.length);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  useGSAP(() => {
    // Stagger character animation for name
    if (nameRef.current) {
      const chars = nameRef.current.querySelectorAll('.name-char');
      gsap.fromTo(
        chars,
        { opacity: 0, y: 30, rotateX: -90 },
        {
          opacity: 1,
          y: 0,
          rotateX: 0,
          duration: 1.2,
          stagger: 0.08,
          ease: 'back.out(1.7)',
          delay: 0.2,
        }
      );
    }

    // Floating animation for stats pills
    gsap.to('.stat-pill', {
      y: -8,
      duration: 2.5,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      stagger: 0.3,
    });
  }, []);

  const nameLetters = "Ahmar Ansari".split("");

  return (
    <section className="min-h-[88vh] flex flex-col justify-center max-w-7xl mx-auto px-4 sm:px-8 py-10">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
        
        {/* Left Content Column */}
        <div className="w-full lg:w-[58%] flex flex-col justify-center pt-8">
          
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-pill border-sky-400/20 text-sky-300 text-xs font-code tracking-wide mb-6 w-fit animate-float-slow">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>Building Scalable & High Performance Apps</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold font-outfit tracking-tight leading-[1.1] text-slate-100">
            Hi There, I'm <br />
            <span ref={nameRef} className="inline-flex flex-wrap text-gradient font-outfit">
              {nameLetters.map((char, index) => (
                <span
                  key={index}
                  className="name-char inline-block"
                  style={{ display: char === " " ? "inline" : "inline-block", width: char === " " ? "0.3em" : "auto" }}
                >
                  {char}
                </span>
              ))}
            </span>
          </h1>

          {/* Dynamic Role Display */}
          <p className="text-xl sm:text-2xl font-jakarta text-slate-300 mt-6 flex items-center gap-3">
            <span>I am a</span>
            <span className="font-bold text-sky-400 font-code border-b-2 border-sky-400/50 pb-0.5 min-w-[240px] inline-block transition-all duration-500">
              {heroRoles[textIndex]}
            </span>
          </p>

          {/* HR Key Credentials Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-8">
            <div className="stat-pill p-3.5 rounded-2xl glass-card border border-sky-500/20 flex flex-col">
              <div className="flex items-center gap-1.5 text-sky-400 text-xs font-semibold">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Problem Solving</span>
              </div>
              <span className="text-xl font-bold font-outfit text-white mt-1">500+ LeetCode</span>
              <span className="text-[11px] text-slate-400">DSA & Algorithms</span>
            </div>

            <div className="stat-pill p-3.5 rounded-2xl glass-card border border-indigo-500/20 flex flex-col">
              <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-semibold">
                <GraduationCap className="w-4 h-4 text-indigo-400" />
                <span>B.Tech CSE</span>
              </div>
              <span className="text-xl font-bold font-outfit text-white mt-1">7.99 CGPA</span>
              <span className="text-[11px] text-slate-400">Final Year Graduate</span>
            </div>

            <div className="stat-pill p-3.5 rounded-2xl glass-card border border-violet-500/20 flex flex-col col-span-2 sm:col-span-1">
              <div className="flex items-center gap-1.5 text-violet-400 text-xs font-semibold">
                <Code2 className="w-4 h-4 text-violet-400" />
                <span>Full Stack</span>
              </div>
              <span className="text-xl font-bold font-outfit text-white mt-1">MERN Stack</span>
              <span className="text-[11px] text-slate-400">React, Node, Mongo, SQL</span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-4 mt-10">
            <a
              href="#projects"
              className="flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-jakarta font-semibold text-base shadow-glow-cyan hover:scale-105 active:scale-95 transition-all duration-300"
            >
              <span>View Projects</span>
              <ArrowUpRight className="w-5 h-5" />
            </a>

            <a
              href="#contact_us"
              className="flex items-center gap-2 px-7 py-3.5 rounded-2xl glass-pill hover:bg-white/10 text-slate-200 border border-white/15 font-jakarta font-semibold text-base hover:border-sky-400/40 hover:scale-105 active:scale-95 transition-all duration-300"
            >
              <span>Contact Me</span>
            </a>
          </div>

          {/* Social Links Bar */}
          <div className="flex items-center gap-4 mt-8 pt-6 border-t border-white/10">
            <span className="text-xs font-code text-slate-400 uppercase tracking-wider">Connect With Me:</span>
            <div className="flex items-center gap-3">
              {socialsIcons.map((social, index) => (
                <Social
                  key={index}
                  Icon={social.icon}
                  href={social.href}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right Visual Image & Tech Aura */}
        <div className="w-full lg:w-[42%] flex justify-center items-center relative py-6">
          
          {/* Neon Glow backdrop circle */}
          <div className="absolute w-72 h-72 sm:w-80 sm:h-80 rounded-full bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 blur-3xl animate-pulse-glow" />

          {/* Main Avatar Container */}
          <div className="relative group p-4 rounded-3xl glass-card border border-white/15 shadow-2xl">
            
            {/* Animated Gradient Border Overlay */}
            <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 opacity-30 group-hover:opacity-70 blur transition-all duration-500" />
            
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
              <img
                src={heroImg}
                alt="Ahmar Ansari"
                className="w-72 sm:w-80 h-auto object-cover grayscale-[20%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
              />
            </div>

            {/* Floating Tech Pill 1 */}
            <div className="absolute -top-3 -right-3 px-3.5 py-1.5 rounded-xl glass-card border border-sky-400/40 text-sky-300 text-xs font-code font-semibold flex items-center gap-1.5 shadow-lg animate-float-slow">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
              ReactJS & Next
            </div>

            {/* Floating Tech Pill 2 */}
            <div className="absolute -bottom-3 -left-3 px-3.5 py-1.5 rounded-xl glass-card border border-indigo-400/40 text-indigo-300 text-xs font-code font-semibold flex items-center gap-1.5 shadow-lg animate-float-slow" style={{ animationDelay: '2s' }}>
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              Node.js & Express
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

export default Hero;