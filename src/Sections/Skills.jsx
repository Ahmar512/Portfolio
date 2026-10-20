import React, { useState } from 'react';
import { skills } from '../Constant';
import SkillSets from '../Components/SkillSets';
import { Layers } from 'lucide-react';

const Skills = () => {
  const [activeFilter, setActiveFilter] = useState('All');

  const filteredSkills = activeFilter === 'All'
    ? skills
    : skills.filter((s) => s.title.toLowerCase() === activeFilter.toLowerCase());

  return (
    <section id="skills" className="max-w-6xl mx-auto py-8">
      {/* Section Title */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-pill border-sky-400/20 text-sky-300 text-xs font-code mb-3">
          <Layers className="w-3.5 h-3.5 text-sky-400" />
          <span>My Tech Ecosystem</span>
        </div>
        
        <h2 className="text-3xl sm:text-5xl font-extrabold font-outfit tracking-tight">
          Technical <span className="text-gradient font-outfit">Skills</span>
        </h2>
        <p className="text-slate-400 font-jakarta text-sm sm:text-base mt-3 max-w-lg mx-auto">
          A comprehensive breakdown of technologies, frameworks, and developer tools I actively build with.
        </p>

        {/* Filter Pills */}
        <div className="flex flex-wrap justify-center gap-2 mt-8">
          {['All', 'Frontend', 'Backend', 'Others'].map((category) => (
            <button
              key={category}
              onClick={() => setActiveFilter(category)}
              className={`px-4 py-2 rounded-full text-xs font-jakarta font-semibold transition-all duration-300 ${
                activeFilter === category
                  ? 'bg-sky-500 text-white shadow-glow-cyan scale-105'
                  : 'glass-pill text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Cards Grid */}
      <div className="flex flex-wrap justify-center gap-6">
        {filteredSkills.map((s) => (
          <SkillSets key={s.title} title={s.title} tech={s.tech} />
        ))}
      </div>
    </section>
  );
};

export default Skills;