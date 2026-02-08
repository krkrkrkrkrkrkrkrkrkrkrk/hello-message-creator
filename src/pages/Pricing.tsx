import Navbar from "@/components/Navbar";
import PricingSection from "@/components/Pricing";
import Footer from "@/components/Footer";

const Pricing = () => {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20">
        <PricingSection />
      </div>
      <Footer />
    </main>
  );
};

export default Pricing;
