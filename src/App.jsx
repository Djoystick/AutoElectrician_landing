import ElectricCanvas from './components/ElectricCanvas';
import CustomCursor   from './components/CustomCursor';
import Navbar         from './components/Navbar';
import Hero           from './components/Hero';
import Services       from './components/Services';
import Contacts       from './components/Contacts';
import Footer         from './components/Footer';

export default function App() {
  return (
    <>
      {/* Fixed background canvas */}
      <ElectricCanvas />

      {/* Custom neon cursor */}
      <CustomCursor />

      {/* Navigation */}
      <Navbar />

      {/* Main content */}
      <main className="relative z-10">
        <Hero />
        <Services />
        <Contacts />
        <Footer />
      </main>
    </>
  );
}
