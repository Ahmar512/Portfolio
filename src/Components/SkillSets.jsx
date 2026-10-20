import React from 'react';

const SkillSets = ({ title, tech }) => {
  return (
    <div
      data-aos="fade-up"
      className="glass-card rounded-3xl p-6 border border-white/10 hover:border-sky-500/40 shadow-xl transition-all duration-500 group relative overflow-hidden flex-1 min-w-[300px] max-w-[420px]"
    >
      {/* Background radial highlight */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl group-hover:bg-sky-500/20 transition-all pointer-events-none" />

      <h3 className="font-outfit text-center font-bold text-2xl mb-6 text-slate-100 group-hover:text-sky-300 transition-colors flex items-center justify-center gap-2">
        <span className="w-2 h-2 rounded-full bg-sky-400" />
        {title}
      </h3>

      <div className="flex flex-wrap gap-3 justify-center">
        {tech.map((t, index) => (
          <div
            key={index}
            className="px-3.5 py-2.5 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-sky-400/50 hover:bg-sky-500/10 flex items-center gap-2.5 transition-all duration-300 hover:scale-105 hover:shadow-glow-cyan group/item cursor-pointer"
          >
            <div className="w-6 h-6 flex justify-center items-center rounded-lg bg-slate-800/80 p-1 border border-white/5 group-hover/item:scale-110 transition-transform">
              <img src={t.href} alt={t.label} className="w-full h-full object-contain" />
            </div>
            <span className="font-jakarta text-xs sm:text-sm font-medium text-slate-200 group-hover/item:text-white">
              {t.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SkillSets;