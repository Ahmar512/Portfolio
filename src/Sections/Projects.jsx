import React, { useRef } from "react";
import { projects } from "../Constant";
import ProjectCard from "../Components/ProjectCard";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { FolderGit2, Sparkles } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const Projects = () => {
  const sectionRef = useRef(null);
  const triggerRef = useRef(null);

  useGSAP(() => {
    const pin = gsap.to(triggerRef.current, {
      x: () => -(triggerRef.current.scrollWidth - window.innerWidth),
      ease: "none",
      scrollTrigger: {
        trigger: sectionRef.current,
        pin: true,
        scrub: 1,
        start: "top top",
        end: () => `+=${triggerRef.current.scrollWidth}`,
        invalidateOnRefresh: true,
      },
    });

    return () => {
      pin.kill();
    };
  }, { scope: sectionRef });

  return (
    <section
      ref={sectionRef}
      id="projects"
      className="relative h-screen w-full overflow-hidden flex flex-col justify-center bg-[#050811]"
    >
      {/* Header Info Overlay */}
      <div className="absolute top-8 left-6 md:top-12 md:left-20 z-20">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full glass-pill border-sky-400/20 text-sky-300 text-xs font-code mb-2">
          <FolderGit2 className="w-3.5 h-3.5 text-sky-400" />
          <span>Showcase Portfolio</span>
        </div>

        <h2 className="text-3xl md:text-6xl font-extrabold font-outfit tracking-tight">
          Featured <span className="text-gradient font-outfit">Projects</span>
        </h2>
        <p className="text-slate-400 font-jakarta mt-2 max-w-md text-xs md:text-sm hidden sm:block">
          Explore my full-stack web applications featuring real-time socket messaging, secure authentication, and clean UI design.
        </p>
      </div>

      {/* Scrollable Horizontal Track */}
      <div
        ref={triggerRef}
        className="flex gap-8 md:gap-10 px-6 md:px-20 items-center w-max mt-24 md:mt-16 z-10"
      >
        {/* Leading spacer for title visibility */}
        <div className="w-[10vw] md:w-[420px] flex-shrink-0" />

        {projects.map((p, index) => (
          <div key={index} className="flex-shrink-0">
            <ProjectCard
              title={p.title}
              content={p.content}
              href={p.href}
              tech={p.tech}
              link={p.link}
            />
          </div>
        ))}

        {/* Ending spacer */}
        <div className="w-[15vw] md:w-[300px] flex-shrink-0" />
      </div>

      {/* Decorative background glows */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-sky-600/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-900/15 blur-[120px] rounded-full pointer-events-none" />
    </section>
  );
};

export default Projects;
