import { projects, skills, socialsIcons } from '../../Constant'
import { ahmar } from '../../assets/images'
import { about, education } from '../portfolioData'
import { WORLD } from '../world'

const Chip = ({ children, color }) => (
  <span className="px-2 py-0.5 rounded-full text-xs font-montserrat border" style={{ borderColor: color, color }}>
    {children}
  </span>
)

function About({ color }) {
  return (
    <div className="flex gap-6 max-md:flex-col items-center md:items-start">
      <img src={ahmar} alt="Ahmar Ansari" className="w-40 rounded-xl border-2 shrink-0" style={{ borderColor: color }} />
      <div className="font-montserrat text-slate-200 text-sm leading-relaxed space-y-3">
        <h3 className="text-3xl font-bold font-palanquin text-white">{about.name}</h3>
        <p className="font-bold" style={{ color }}>{about.role}</p>
        {about.paragraphs.map((p) => (
          <p key={p.slice(0, 20)}>{p}</p>
        ))}
        <a href={about.resume} target="_blank" rel="noreferrer" className="inline-block mt-2 px-4 py-2 rounded-lg font-bold text-black" style={{ background: color }}>
          View Resume ↗
        </a>
      </div>
    </div>
  )
}

function Projects({ color }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {projects.map((p) => (
        <div key={p.title} className="bg-black/60 rounded-xl border overflow-hidden" style={{ borderColor: `${color}66` }}>
          <img src={p.href} alt={p.title} className="w-full h-36 object-cover" />
          <div className="p-4 space-y-2">
            <h3 className="font-bold font-palanquin text-lg">{p.title}</h3>
            <p className="text-xs text-slate-300 font-montserrat leading-relaxed">{p.content}</p>
            <div className="flex flex-wrap gap-1.5">
              {p.tech.map((t) => (
                <Chip key={t} color={color}>{t}</Chip>
              ))}
            </div>
            <a href={p.link} target="_blank" rel="noreferrer" className="inline-block text-sm font-bold mt-1" style={{ color }}>
              Open live project ↗
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}

function Skills({ color }) {
  return (
    <div className="grid md:grid-cols-3 gap-4">
      {skills.map((group) => (
        <div key={group.title} className="bg-black/60 rounded-xl border p-4" style={{ borderColor: `${color}66` }}>
          <h3 className="font-bold font-palanquin text-xl mb-3" style={{ color }}>{group.title}</h3>
          <div className="grid grid-cols-2 gap-3">
            {group.tech.map((t) => (
              <div key={t.label} className="flex items-center gap-2 text-sm font-montserrat">
                <img src={t.href} alt="" className="w-7 h-7 object-contain" />
                {t.label}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function Education({ color }) {
  return (
    <div className="space-y-4">
      {education.map((e) => (
        <div key={e.degree} className="flex gap-4 bg-black/60 rounded-xl border p-4" style={{ borderColor: `${color}66` }}>
          <img src={e.logo} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
          <div className="font-montserrat text-sm space-y-1">
            <h3 className="font-bold font-palanquin text-lg leading-tight">{e.school}</h3>
            <p className="text-slate-300">{e.degree}</p>
            <p className="text-slate-400 text-xs">{e.period}</p>
            <p><span className="font-bold" style={{ color }}>Grade:</span> {e.grade}</p>
            {e.note && <p className="text-slate-300 text-xs">{e.note}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

function Contact({ color }) {
  const links = socialsIcons.filter((s) => s.href)
  return (
    <div className="font-montserrat space-y-5">
      <p className="text-slate-200">
        Liked the ride? I&apos;m open to SDE roles and interesting projects. The fastest way to reach me:
      </p>
      <div className="flex flex-wrap gap-3">
        {links.map(({ icon: Icon, href }) => (
          <a key={href} href={href} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg border font-bold hover:bg-white/10" style={{ borderColor: color, color }}>
            <Icon fontSize="small" />
            {href.includes('linkedin') ? 'LinkedIn' : href.includes('github') ? 'GitHub' : 'Profile'}
          </a>
        ))}
        <a href={about.resume} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-lg font-bold text-black" style={{ background: color }}>
          Resume ↗
        </a>
      </div>
    </div>
  )
}

const VIEWS = { about: About, projects: Projects, skills: Skills, education: Education, contact: Contact }

export default function PortfolioPanel({ id, onClose }) {
  const l = WORLD.lm[id]
  const View = VIEWS[id]
  if (!l || !View) return null
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="w-full max-w-4xl max-h-full overflow-y-auto rounded-2xl border-2 bg-[#120a24]/95 p-5 md:p-7"
        style={{ borderColor: l.neon, boxShadow: `0 0 40px ${l.neon}55` }}
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-xs tracking-[0.3em] font-montserrat text-slate-400">{l.sign}</p>
            <h2 className="text-4xl md:text-5xl font-black italic" style={{ color: l.neon, textShadow: `0 0 18px ${l.neon}`, fontFamily: '"Arial Black", Impact, sans-serif' }}>
              {l.title}
            </h2>
          </div>
          <button onClick={onClose} className="shrink-0 px-3 py-2 rounded-lg border border-white/30 hover:bg-white/10 text-sm font-montserrat">
            Back to game <span className="opacity-60">(Esc)</span>
          </button>
        </div>
        <View color={l.neon} />
      </div>
    </div>
  )
}
