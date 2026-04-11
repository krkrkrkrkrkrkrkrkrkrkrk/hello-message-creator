import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Shield } from "lucide-react";

const Terms = () => {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-28 pb-20">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="flex items-center gap-3 mb-8">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="font-display text-3xl font-bold">Terms of Service</h1>
          </div>
          
          <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
            <p className="text-sm">Last updated: April 2026</p>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
              <p>By accessing and using Wbhf Auth ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">2. Description of Service</h2>
              <p>Wbhf Auth provides authentication, licensing, and script protection services for Lua developers. This includes key management, HWID locking, obfuscation, and Discord bot integration.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">3. User Accounts</h2>
              <p>You are responsible for maintaining the confidentiality of your account credentials. You must not share your API keys or bot tokens with unauthorized parties. Any activity under your account is your responsibility.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">4. Acceptable Use</h2>
              <p>You agree not to:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Use the Service for any illegal purposes</li>
                <li>Attempt to reverse engineer, hack, or disrupt the Service</li>
                <li>Use the Service to distribute malware or malicious scripts</li>
                <li>Violate Roblox's Terms of Service through the use of our platform</li>
                <li>Resell or redistribute access to the Service without authorization</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">5. Subscription Plans</h2>
              <p>Paid plans provide additional features and higher limits. Subscriptions are billed according to the selected plan duration. Features and pricing are subject to change with notice.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">6. Intellectual Property</h2>
              <p>The Service, including its design, code, and documentation, is the property of Wbhf Auth. Your scripts and content remain your property. We do not claim ownership over user-uploaded content.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">7. Limitation of Liability</h2>
              <p>Wbhf Auth is provided "as is" without warranties of any kind. We are not liable for any damages arising from the use or inability to use the Service, including but not limited to loss of data, revenue, or business opportunities.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">8. Termination</h2>
              <p>We reserve the right to suspend or terminate accounts that violate these terms. Users may delete their account at any time through the dashboard settings.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">9. Contact</h2>
              <p>For questions about these terms, contact us through our <a href="https://discord.gg/CyyPTwY9Mq" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Discord server</a>.</p>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
};

export default Terms;