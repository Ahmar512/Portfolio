import React, { useRef } from "react";
import { projects } from "../Constant";
import ProjectCard from "../Components/ProjectCard";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

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
      className="relative h-screen w-full overflow-hidden flex flex-col md:justify-center bg-[#050505]"
    >
      <div className="absolute top-8 left-6 md:top-10 md:left-20 z-10">
        <h1 className="text-4xl md:text-8xl font-bold font-palanquin tracking-tighter">
          My <span className="text-blue-400">Projects</span>
        </h1>
        <p className="text-slate-400 font-montserrat mt-2 md:mt-4 max-w-lg text-sm md:text-lg px-2 md:px-0">
          A showcase of my recent work, built with passion and precision. 
          Scroll down to explore my journey.
        </p>
      </div>

      <div 
        ref={triggerRef} 
        className="flex gap-8 md:gap-12 px-10 md:px-20 items-center w-max mt-32 md:mt-0"
      >
        {/* Placeholder for spacing to let the title be visible before cards start passing */}
        <div className="w-[30vw] md:w-[600px] flex-shrink-0" /> 
        
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

        {/* Ending space */}
        <div className="w-[20vw] md:w-[400px] flex-shrink-0" />
      </div>

      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-1/4 h-1/4 bg-blue-900/10 blur-[100px] rounded-full pointer-events-none" />
    </section>
  );
};

export default Projects;

