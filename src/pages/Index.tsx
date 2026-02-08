import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import CodePreview from "@/components/CodePreview";
import APIShowcase from "@/components/APIShowcase";
import Pricing from "@/components/Pricing";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";
import UserReviews from "@/components/UserReviews";

const Index = () => {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <Features />
      <CodePreview />
      <APIShowcase />
      <UserReviews />
      <Pricing />
      <CTA />
      <Footer />
    </main>
  );
};

export default Index;
