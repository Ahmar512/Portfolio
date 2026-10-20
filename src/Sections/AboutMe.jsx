import React from 'react';
import { ahmar } from '../assets/images';
import { Award, Terminal, Code, Cpu, ExternalLink, Download } from 'lucide-react';

const AboutMe = () => {
  const handleClick = () => {
    window.open('https://drive.google.com/file/d/14KnfbNmtSNi5VPRDWKdxaJ8deQWNdt68/view?usp=drive_link', '_blank');
  };

  return (
    <section id="aboutMe" className="max-w-6xl mx-auto py-8">
      {/* Section Header */}
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-5xl font-extrabold font-outfit tracking-tight">
          About <span className="text-gradient font-outfit">Me</span>
        </h2>
        <p className="text-slate-400 font-jakarta text-sm sm:text-base mt-3 max-w-xl mx-auto">
          Driven software engineer with a passion for problem solving, algorithmic efficiency, and full-stack web applications.
        </p>
      </div>

      {/* Main Glass Card */}
      <div data-aos="fade-up" className="glass-card rounded-3xl p-6 sm:p-10 border border-white/10 shadow-2xl relative overflow-hidden">
        
        {/* Glow corner background accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-center gap-10 relative z-10">
          
          {/* Left Avatar Column */}
          <div className="w-full lg:w-[35%] flex flex-col items-center">
            <div className="relative group">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 opacity-40 group-hover:opacity-100 blur transition duration-500" />
              <img
                className="relative rounded-2xl w-60 sm:w-64 h-auto object-cover border border-white/10 group-hover:scale-105 transition-transform duration-500"
                src={ahmar}
                alt="Ahmar Ansari"
              />
            </div>
            
            <div className="mt-4 px-4 py-1.5 rounded-full bg-sky-500/10 border border-sky-400/30 text-sky-300 font-code text-xs font-semibold">
              Available for SDE Roles 🚀
            </div>
          </div>

          {/* Right Text Column */}
          <div className="w-full lg:w-[65%] flex flex-col justify-center">
            <h3 className="text-2xl sm:text-3xl font-bold font-outfit text-white">
              Hi, I'm Ahmar Ansari
            </h3>
            <p className="text-sky-400 font-code text-sm font-semibold mt-1">
              Full Stack Developer & Competitive Programmer
            </p>

            <p className="font-jakarta text-slate-300 text-sm sm:text-base leading-relaxed mt-5">
              👋 I am a dedicated Software Developer with a strong foundation in <strong className="text-white">Java, Data Structures & Algorithms</strong>. Currently in my final year of B.Tech in Computer Science, I have solved <span className="text-sky-400 font-semibold underline decoration-sky-400/40">500+ problems on LeetCode</span>, sharpening my analytical and logical problem-solving capabilities.
              <br /><br />
              I possess hands-on experience in full-stack engineering utilizing <strong className="text-white">ReactJS, Tailwind CSS, Node.js, Express, and Databases (MongoDB/MySQL/PostgreSQL)</strong>. I've engineered production apps like Real-Time Chat System with Socket.IO, Authentication System with JWT & OTP verification, and healthcare solutions.
              <br /><br />
              I thrive on building scalable software and tackling complex backend/frontend engineering challenges.
            </p>

            {/* Quick Stats Counter Grid */}
            <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/10">
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold font-outfit text-sky-400">500+</span>
                <p className="text-xs font-jakarta text-slate-400 mt-0.5">LeetCode Solved</p>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold font-outfit text-indigo-400">7.99</span>
                <p className="text-xs font-jakarta text-slate-400 mt-0.5">B.Tech CGPA</p>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold font-outfit text-purple-400">4+</span>
                <p className="text-xs font-jakarta text-slate-400 mt-0.5">Major Web Apps</p>
              </div>
            </div>

            {/* Resume Button */}
            <div className="mt-8 flex items-center gap-4">
              <button
                onClick={handleClick}
                className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-jakarta font-semibold text-sm shadow-glow-cyan hover:scale-105 active:scale-95 transition-all duration-300"
              >
                <span>Check Resume</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
};

export default AboutMe;