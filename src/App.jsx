import CustomCursor from './components/CustomCursor';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Services from './components/Services';
import Contacts from './components/Contacts';
import Footer from './components/Footer';
import FloatingContact from './components/FloatingContact';

export default function App() {
  return (
    <>
      <CustomCursor />
      <Navbar />

      <main className="relative z-10">
        <Hero />
        <Services />
        <Contacts />
        <Footer />
      </main>

      <FloatingContact />
    </>
  );
}
