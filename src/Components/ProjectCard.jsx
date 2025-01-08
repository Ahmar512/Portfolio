import React from 'react'

const ProjectCard = ({title, content, href, tech, link}) => {
  return (
    <div data-aos="fade-up" className='w-[340px] flex flex-col px-5 py-5 bg-black rounded-3xl hover:scale-110 transition-transform'>
        <a href={link}><img src={href} alt="title" width={300} /></a>
        <div className='w-[300px] flex flex-wrap gap-2  mt-5'>
            {tech.map((t, index)=>(
                <p key={index} className='bg-blue-300 text-blue-500 px-2 py-1 rounded-xl text-sm'>{t}</p>
            ))}
        </div>
        <a href={link}><h1 className='text-2xl font-bold my-3 font-palanquin'>{title}</h1></a>
        <p className='w-[300px] font-montserrat text-slate-300'>{content}</p>

    </div>
  )
}

export default ProjectCard