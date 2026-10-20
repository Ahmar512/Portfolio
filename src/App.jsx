import { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Hero from './Sections/Hero';
import Skills from './Sections/Skills';
import Nav from './Components/Nav';
import AboutMe from './Sections/AboutMe';
import Projects from './Sections/Projects';
import Education from './Sections/Education';
import ContactUs from './Sections/ContactUs';
import Footer from './Sections/Footer';
import { ArrowUp } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

function App() {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const cursorRef = useRef(null);
  const cursorDotRef = useRef(null);

  // Initialize Lenis Smooth Scroll & GSAP Integration
  useEffect(() => {
    let lenis;
    if (window.Lenis) {
      lenis = new window.Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        smoothTouch: false,
      });

      lenis.on('scroll', ScrollTrigger.update);

      gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
      });

      gsap.ticker.lagSmoothing(0);
    }

    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (lenis) lenis.destroy();
    };
  }, []);

  // Smooth mouse follower cursor
  useEffect(() => {
    const cursor = cursorRef.current;
    const cursorDot = cursorDotRef.current;
    if (!cursor || !cursorDot) return;

    const moveCursor = (e) => {
      const { clientX: x, clientY: y } = e;

      gsap.to(cursor, {
        x: x - 16,
        y: y - 16,
        duration: 0.5,
        ease: 'power2.out',
      });

      gsap.to(cursorDot, {
        x: x - 4,
        y: y - 4,
        duration: 0.1,
        ease: 'power1.out',
      });
    };

    window.addEventListener('mousemove', moveCursor);
    return () => window.removeEventListener('mousemove', moveCursor);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main className="relative bg-[#050811] text-slate-100 min-h-screen selection:bg-sky-500/30 selection:text-sky-200">
      {/* Custom Glow Cursor Follower (Hidden on touch devices) */}
      <div
        ref={cursorRef}
        className="fixed top-0 left-0 w-8 h-8 rounded-full border border-sky-400/40 bg-sky-400/10 pointer-events-none z-50 backdrop-blur-[2px] hidden md:block"
      />
      <div
        ref={cursorDotRef}
        className="fixed top-0 left-0 w-2 h-2 rounded-full bg-sky-400 pointer-events-none z-50 hidden md:block shadow-[0_0_10px_#38bdf8]"
      />

      {/* Ambient Glowing Background Orbs */}
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[140px] pointer-events-none z-0 animate-pulse-glow" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[160px] pointer-events-none z-0 animate-pulse-glow" />

      {/* Navbar */}
      <Nav />

      {/* Hero Section */}
      <section id="home" className="relative z-10 w-full pt-20">
        <Hero />
      </section>

      {/* About Me Section */}
      <section id="aboutMe" className="relative z-10 px-6 sm:px-16 lg:px-24 py-16">
        <AboutMe />
      </section>

      {/* Skills Section */}
      <section id="skills" className="relative z-10 px-6 sm:px-12 lg:px-20 py-16">
        <Skills />
      </section>

      {/* Projects Section (Pinning Horizontal Scroll) */}
      <section id="projects" className="relative z-10 w-full">
        <Projects />
      </section>

      {/* Education Section */}
      <section id="education" className="relative z-10 px-6 sm:px-16 lg:px-24 py-16">
        <Education />
      </section>

      {/* Contact Us Section */}
      <section id="contact_us" className="relative z-10 px-6 sm:px-16 lg:px-24 py-16">
        <ContactUs />
      </section>

      {/* Footer Section */}
      <Footer />

      {/* Floating Back to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          aria-label="Scroll to top"
          className="fixed bottom-8 right-8 z-40 p-3 rounded-full bg-sky-500/20 hover:bg-sky-500/40 border border-sky-400/30 backdrop-blur-md text-sky-400 hover:text-white transition-all duration-300 shadow-glow-cyan hover:scale-110 active:scale-95"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </main>
  );
}

export default App;