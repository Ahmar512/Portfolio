import React from "react";
import { projects } from "../Constant";
import ProjectCard from "../Components/ProjectCard";
import { MoveRight } from "lucide-react";
const Projects = () => {
  return (
    <section id="projects relative">
      <h1 className="text-center text-5xl font-bold font-palanquin my-5">
        <span className="text-blue-300">My</span> Projects
      </h1>
      <p className="text-center font-montserrat text-slate-300">
        Here are some of my Projects that I build when I was learning MERN
        stack.
      </p>
      <div className="flex my-5 gap-5 max-lg:gap-5  sm:flex-wrap sm:justify-center sm:items-center sm:w-full max-sm:h-[600px] px-20 max-lg:px-10 max-md:px-5 max-sm:overflow-x-auto max-sm:px-5">
        {projects.map((p) => (
          <ProjectCard
            key={p.title}
            title={p.title}
            content={p.content}
            href={p.href}
            tech={p.tech}
            link={p.link}
          />
        ))}
      </div>
    </section>
  );
};

export default Projects;
