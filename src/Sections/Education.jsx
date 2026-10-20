import React from 'react';
import { SRMU, CPI } from '../assets/images';
import { GraduationCap, BookOpen, Calendar, Award } from 'lucide-react';

const Education = () => {
  const educationData = [
    {
      institution: "Shri Ramswaroop Memorial University, Lucknow",
      degree: "Bachelor of Technology (B.Tech)",
      specialization: "Computer Science and Engineering",
      duration: "July 2021 - Aug 2025",
      grade: "7.99 CGPA",
      image: SRMU,
      description:
        "Pursuing a 4-year degree in Computer Science & Engineering. Completed 6 semesters with a strong academic record of 7.99 CGPA. Key focus on Data Structures & Algorithms, Operating Systems, Database Management Systems, and MERN Full-Stack Development.",
      badgeColor: "from-sky-500 to-indigo-600",
    },
    {
      institution: "Children Public Inter College Devgaon, Azamgarh",
      degree: "State Board (Class XII)",
      specialization: "Science Stream with Computer Application",
      duration: "2020",
      grade: "71%",
      image: CPI,
      description:
        "Completed Class 12 Higher Secondary education studying Core Science subjects alongside Computer Application fundamentals.",
      badgeColor: "from-indigo-500 to-purple-600",
    },
    {
      institution: "Children Public Inter College Devgaon, Azamgarh",
      degree: "State Board (Class X)",
      specialization: "Science with Computer Application",
      duration: "2018",
      grade: "80%",
      image: CPI,
      description:
        "Completed Class 10 High School education with distinction in Science and Computer Science.",
      badgeColor: "from-purple-500 to-pink-600",
    },
  ];

  return (
    <section id="education" className="max-w-5xl mx-auto py-8">
      {/* Section Header */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-pill border-sky-400/20 text-sky-300 text-xs font-code mb-3">
          <GraduationCap className="w-3.5 h-3.5 text-sky-400" />
          <span>Academic Background</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-extrabold font-outfit tracking-tight">
          Education & <span className="text-gradient font-outfit">Learning</span>
        </h2>
        <p className="text-slate-400 font-jakarta text-sm sm:text-base mt-3 max-w-lg mx-auto">
          An overview of my academic milestones and foundational Computer Science education.
        </p>
      </div>

      {/* Timeline Container */}
      <div className="relative border-l-2 border-sky-500/30 ml-4 sm:ml-32 pl-6 sm:pl-10 space-y-12">
        {educationData.map((edu, index) => (
          <div
            key={index}
            data-aos="fade-up"
            data-aos-delay={index * 150}
            className="relative group"
          >
            {/* Glowing Timeline Dot */}
            <div className="absolute -left-[31px] sm:-left-[47px] top-6 w-5 h-5 rounded-full bg-slate-900 border-2 border-sky-400 group-hover:scale-125 group-hover:bg-sky-400 transition-all duration-300 shadow-glow-cyan flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 group-hover:bg-slate-900" />
            </div>

            {/* Glass Card */}
            <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 hover:border-sky-500/40 shadow-xl transition-all duration-500 hover:shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-white/10">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-white/10 overflow-hidden flex-shrink-0 p-1 flex justify-center items-center">
                    <img
                      src={edu.image}
                      alt={edu.institution}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  </div>
                  <div>
                    <h3 className="font-outfit font-bold text-lg sm:text-xl text-white group-hover:text-sky-300 transition-colors">
                      {edu.institution}
                    </h3>
                    <p className="text-xs sm:text-sm font-semibold font-jakarta text-sky-400 mt-0.5">
                      {edu.degree} — <span className="text-slate-300 font-normal">{edu.specialization}</span>
                    </p>
                  </div>
                </div>

                {/* Grade Badge */}
                <div className={`px-4 py-1.5 rounded-full bg-gradient-to-r ${edu.badgeColor} text-white font-outfit font-bold text-xs sm:text-sm shadow-md w-fit flex items-center gap-1.5`}>
                  <Award className="w-3.5 h-3.5 text-white" />
                  <span>{edu.grade}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-code text-slate-400 mb-3">
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                <span>{edu.duration}</span>
              </div>

              <p className="text-xs sm:text-sm font-jakarta text-slate-300 leading-relaxed">
                {edu.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Education;