import React from 'react';

const Social = ({ Icon, href }) => {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Social Link"
    >
      <div className="w-10 h-10 rounded-full glass-pill border border-white/10 flex justify-center items-center text-slate-300 hover:text-sky-300 hover:border-sky-400/40 hover:bg-sky-500/20 hover:scale-115 hover:shadow-glow-cyan transition-all duration-300">
        <Icon className="w-5 h-5" />
      </div>
    </a>
  );
};

export default Social;