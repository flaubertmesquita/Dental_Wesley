import Header from "./components/Header";
import Hero from "./components/Hero";
import FeaturesStrip from "./components/FeaturesStrip";
import About from "./components/About";
import Stats from "./components/Stats";
import Services from "./components/Services";
import Differentials from "./components/Differentials";
import Credentials from "./components/Credentials";
import Testimonials from "./components/Testimonials";
import Contact from "./components/Contact";
import Footer from "./components/Footer";
import WhatsAppButton from "./components/WhatsAppButton";

export default function App() {
  return (
    <div id="inicio" className="bg-ice text-ink">
      <a
        href="#sobre"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-azure focus:px-4 focus:py-2 focus:text-sm focus:text-navy-950"
      >
        Pular para o conteúdo
      </a>
      <Header />
      <main>
        <Hero />
        <FeaturesStrip />
        <About />
        <Stats />
        <Services />
        <Differentials />
        <Credentials />
        <Testimonials />
        <Contact />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
