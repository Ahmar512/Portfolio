import React from 'react'
import { projects } from '../Constant'
import ProjectCard from '../Components/ProjectCard'
const Projects = () => {
  return (
    <section id='projects'>
        <h1 className='text-center text-5xl font-bold font-palanquin my-5'><span className='text-blue-300'>My</span> Projects</h1>
        <p className='text-center font-montserrat text-slate-300'>Here are some of my Projects that I build when I was learning MERN stack.</p>
        <div className='flex my-5 flex-wrap gap-10 justify-center'>
            {projects.map((p)=>(
                <ProjectCard
                    key={p.title}
                    title={p.title}
                    content= {p.content}
                    href = {p.href}
                    tech = {p.tech}
                    link = {p.link}
                />
            ))}
        </div>
    </section>
  )
}

export default Projects