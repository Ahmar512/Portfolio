import React from 'react';
import { ExternalLink, ArrowUpRight, Github } from 'lucide-react';

const ProjectCard = ({ title, content, href, tech, link }) => {
  return (
    <div className="group relative w-[85vw] sm:w-[420px] md:w-[500px] glass-card rounded-[2.5rem] overflow-hidden border border-white/10 hover:border-sky-500/50 transition-all duration-700 hover:shadow-[0_0_50px_-10px_rgba(56,189,248,0.3)] flex-shrink-0 flex flex-col justify-between">
      
      {/* Image Container with Zoom & Gradient */}
      <div className="relative h-[220px] md:h-[270px] overflow-hidden">
        <img
          src={href}
          alt={title}
          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050811] via-[#050811]/40 to-transparent opacity-80 group-hover:opacity-60 transition-opacity duration-500" />
        
        {/* Top Floating Badge */}
        <div className="absolute top-4 right-4 z-10">
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${title} live demo`}
            className="p-3 bg-slate-900/80 hover:bg-sky-500 backdrop-blur-md text-white rounded-full transition-all duration-300 shadow-glow-cyan hover:scale-110 flex items-center justify-center"
          >
            <ArrowUpRight className="w-5 h-5" />
          </a>
        </div>

        {/* Tech tags floating over bottom of image */}
        <div className="absolute bottom-4 left-6 right-6 flex flex-wrap gap-2">
          {tech.map((t, index) => (
            <span
              key={index}
              className="text-[11px] font-code font-medium bg-slate-900/80 backdrop-blur-md text-sky-300 px-3 py-1 rounded-full border border-sky-400/20 shadow-sm"
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Content Container */}
      <div className="p-6 md:p-8 flex flex-col justify-between flex-grow gap-4">
        <div>
          <h3 className="text-xl md:text-2xl font-bold font-outfit text-white group-hover:text-sky-300 transition-colors duration-300 tracking-tight">
            {title}
          </h3>

          <p className="text-xs md:text-sm text-slate-300 font-jakarta leading-relaxed mt-2.5 line-clamp-4">
            {content}
          </p>
        </div>

        <div className="pt-4 border-t border-white/10 flex items-center justify-between mt-auto">
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="group/link flex items-center gap-2 text-xs md:text-sm font-bold text-sky-400 hover:text-sky-300 transition-colors tracking-wider"
          >
            LIVE DEMO
            <div className="w-6 md:w-8 h-[1px] bg-sky-400/50 group-hover/link:w-12 group-hover/link:bg-sky-400 transition-all duration-300" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;
