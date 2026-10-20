// Portfolio content shown inside the game. Projects, skills and socials come from src/Constant.
import { SRMU, CPI } from '../assets/images'

export const about = {
  name: 'Ahmar Ansari',
  role: 'Full Stack Developer',
  resume: 'https://drive.google.com/file/d/14KnfbNmtSNi5VPRDWKdxaJ8deQWNdt68/view?usp=drive_link',
  paragraphs: [
    "Hi, I'm Ahmar, a dedicated Software Developer with a strong foundation in Java, Data Structures & Algorithms. I've solved 500+ problems on LeetCode, sharpening my problem-solving and analytical skills.",
    'I have hands-on experience in full-stack development with ReactJS, Tailwind CSS, Node.js and databases, and have built projects including a Real-Time Chat application, an Authentication System with OTP & JWT security, and a medicine info hub.',
    "I thrive on solving complex challenges and building efficient, scalable applications. I'm looking for a Software Development Engineer (SDE) role where I can apply my skills to real-world problems.",
  ],
}

export const education = [
  {
    logo: SRMU,
    school: 'Shri Ramswaroop Memorial University, Lucknow',
    degree: 'B.Tech, Computer Science and Engineering',
    period: 'July 2021 - Aug 2025',
    grade: 'CGPA 7.99',
    note: 'Courses in Data Structures, Algorithms and MERN stack web development.',
  },
  {
    logo: CPI,
    school: 'Children Public Inter College Devgaon, Azamgarh',
    degree: 'State Board (XII), Science with Computer Application',
    period: '2020',
    grade: '71%',
  },
  {
    logo: CPI,
    school: 'Children Public Inter College Devgaon, Azamgarh',
    degree: 'State Board (X), Science with Computer Application',
    period: '2018',
    grade: '80%',
  },
]
