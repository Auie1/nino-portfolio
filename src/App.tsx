import { Suspense, lazy } from "react";
import Hero from "./components/Hero";
import HangingBadge from "./components/HangingBadge";
import AboutSection from "./components/AboutSection";
import SkillsSection from "./components/SkillsSection";
import ProjectsGallery from "./components/ProjectsGallery";
import ContactSection from "./components/ContactSection";
import Footer from "./components/Footer";
import Cursor from "./components/Cursor";

// three.js + the 11 MB model load only when the showroom is reached
const ShowroomSection = lazy(() => import("./components/ShowroomSection"));

export default function App() {
  return (
    <>
      <a className="skip-link" href="#about">
        Skip to content
      </a>
      <Cursor />
      <HangingBadge />
      <main>
        <Hero />
        <AboutSection />
        <SkillsSection />
        <ProjectsGallery />
        <Suspense fallback={<section className="section" aria-hidden="true" />}>
          <ShowroomSection />
        </Suspense>
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
