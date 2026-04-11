import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Shield } from "lucide-react";

const Refund = () => {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-28 pb-20">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="flex items-center gap-3 mb-8">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="font-display text-3xl font-bold">Refund Policy</h1>
          </div>

          <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
            <p className="text-sm">Last updated: April 2026</p>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">1. Digital Products</h2>
              <p>Due to the nature of digital products and services, all sales are generally considered final once a subscription code has been redeemed or a service has been activated.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">2. Eligible Refunds</h2>
              <p>We may issue refunds in the following cases:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>The Service was unavailable for an extended period (more than 48 hours) during your subscription</li>
                <li>A critical bug prevented you from using core features and was not resolved within 72 hours</li>
                <li>Duplicate charges or billing errors</li>
                <li>The subscription code was not yet redeemed</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">3. Non-Eligible Refunds</h2>
              <p>Refunds will not be issued for:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Change of mind after purchase</li>
                <li>Account suspension or termination due to Terms of Service violations</li>
                <li>Features that are working as described</li>
                <li>Marketplace purchases from third-party sellers</li>
                <li>Partial usage of a subscription period</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">4. Refund Process</h2>
              <p>To request a refund:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Contact us through our <a href="https://discord.gg/CyyPTwY9Mq" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Discord server</a></li>
                <li>Provide your account email and transaction details</li>
                <li>Describe the reason for the refund request</li>
                <li>Refund requests are reviewed within 3-5 business days</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">5. Cryptocurrency Payments</h2>
              <p>Refunds for cryptocurrency payments will be processed in the original cryptocurrency at the current exchange rate, or as store credit at our discretion.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">6. Contact</h2>
              <p>For refund inquiries, reach out to us on <a href="https://discord.gg/CyyPTwY9Mq" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Discord</a> and open a support ticket.</p>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
};

export default Refund;