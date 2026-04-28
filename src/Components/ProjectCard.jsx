import React from 'react'
import { ExternalLink } from 'lucide-react'

const ProjectCard = ({title, content, href, tech, link}) => {
  return (
    <div className='group relative w-[85vw] sm:w-[380px] md:w-[480px] bg-white/5 backdrop-blur-md border border-white/10 rounded-[2rem] overflow-hidden hover:border-blue-500/50 transition-all duration-700 hover:shadow-[0_0_50px_-12px_rgba(59,130,246,0.3)] flex-shrink-0'>
      {/* Image Container */}
      <div className='relative h-[240px] md:h-[300px] overflow-hidden'>
        <img 
          src={href} 
          alt={title} 
          className='w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-1000 ease-out'
        />
        <div className='absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500' />
        
        <div className='absolute bottom-6 left-6 right-6 flex justify-between items-end transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500'>
          <div className='flex flex-wrap gap-2 max-w-[70%]'>
            {tech.slice(0, 3).map((t, index)=>(
              <span 
                key={index} 
                className='text-[10px] uppercase tracking-widest font-bold bg-blue-500/20 backdrop-blur-md text-blue-400 px-3 py-1.5 rounded-full border border-blue-500/20'
              >
                {t}
              </span>
            ))}
            {tech.length > 3 && (
              <span className='text-[10px] font-bold bg-white/10 backdrop-blur-md text-white/70 px-3 py-1.5 rounded-full'>
                +{tech.length - 3}
              </span>
            )}
          </div>
          
          <a 
            href={link} 
            target="_blank" 
            rel="noopener noreferrer"
            className='p-4 bg-white text-black rounded-full hover:bg-blue-500 hover:text-white transition-all duration-300 shadow-xl'
          >
            <ExternalLink size={20} />
          </a>
        </div>
      </div>

      {/* Content Container */}
      <div className='p-6 md:p-8 flex flex-col gap-4'>
        <h3 className='text-2xl md:text-3xl font-bold font-palanquin text-white group-hover:text-blue-400 transition-colors duration-300 tracking-tight'>
          {title}
        </h3>
        
        <p className='text-xs md:text-sm text-slate-400 font-montserrat leading-relaxed line-clamp-3 group-hover:text-slate-300 transition-colors duration-300'>
          {content}
        </p>

        <div className='mt-2 md:mt-4 pt-4 md:pt-6 border-t border-white/5 flex items-center justify-between'>
          <a 
            href={link} 
            target="_blank" 
            rel="noopener noreferrer"
            className='group/link flex items-center gap-2 text-[10px] md:text-sm font-bold text-slate-300 hover:text-blue-400 transition-colors'
          >
            EXPLORE PROJECT
            <div className='w-6 md:w-8 h-[1px] bg-white/20 group-hover/link:w-10 md:group-hover/link:w-12 group-hover/link:bg-blue-400 transition-all duration-300' />
          </a>
        </div>
      </div>
    </div>
  )
}

export default ProjectCard