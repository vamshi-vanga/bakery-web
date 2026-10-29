import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import MenuSection from '@/components/MenuSection';
import AboutSection from '@/components/AboutSection';
import LocationSection from '@/components/LocationSection';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main className="min-h-screen bg-cream text-espresso">
      <Navbar />
      <Hero />
      <MenuSection />
      <AboutSection />
      <LocationSection />
      <Footer />
    </main>
  );
}