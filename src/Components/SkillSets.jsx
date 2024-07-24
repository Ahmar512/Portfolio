import React from 'react'

const SkillSets = ({title, tech}) => {
  return (
    <div data-aos="fade-up" className=' bg-black  border-[1px] border-blue-300 p-5 rounded-3xl w-[400px] hover:scale-110 transition-transform'>
        <h1 className='font-palanquin text-center font-bold text-3xl mb-5'>{title}</h1>
        <div className='flex flex-wrap gap-3 justify-center'>
            {tech.map((tech, index)=>(
                <div key={index} className='px-3 py-2 border-[1px] rounded-xl border-blue-300 flex gap-2 hover:scale-110 transition-transform font-montserrat'><div><img src={tech.href} alt={tech.label} width={25} height={25} /></div>{tech.label}</div>
            ))}
        </div>
    </div>
  )
}

export default SkillSets