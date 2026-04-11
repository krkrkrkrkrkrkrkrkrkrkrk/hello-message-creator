import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Shield } from "lucide-react";

const Privacy = () => {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-28 pb-20">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="flex items-center gap-3 mb-8">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="font-display text-3xl font-bold">Privacy Policy</h1>
          </div>

          <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
            <p className="text-sm">Last updated: April 2026</p>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">1. Information We Collect</h2>
              <p>We collect the following information:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong className="text-foreground">Account Data:</strong> Email address, display name, and authentication credentials</li>
                <li><strong className="text-foreground">Usage Data:</strong> Script execution logs, IP addresses, executor types, and geographic location</li>
                <li><strong className="text-foreground">Device Data:</strong> Hardware IDs (HWID) for license verification purposes</li>
                <li><strong className="text-foreground">Payment Data:</strong> Transaction records (payment processing is handled by third-party providers)</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">2. How We Use Your Information</h2>
              <p>Your information is used to:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Provide and maintain the Service</li>
                <li>Authenticate users and validate license keys</li>
                <li>Prevent fraud and unauthorized access</li>
                <li>Provide analytics and usage statistics to script owners</li>
                <li>Communicate important updates about the Service</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">3. Data Sharing</h2>
              <p>We do not sell your personal data. Script execution data (username, IP, executor) is shared with the respective script owner for their monitoring purposes. We may share data with law enforcement when legally required.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">4. Data Security</h2>
              <p>We implement industry-standard security measures including encryption at rest and in transit, secure authentication, and regular security audits to protect your data.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">5. Data Retention</h2>
              <p>Account data is retained as long as your account is active. Execution logs are retained for up to 90 days. You may request deletion of your data by contacting us.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">6. Cookies</h2>
              <p>We use essential cookies for authentication and session management. No third-party tracking cookies are used.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">7. Your Rights</h2>
              <p>You have the right to access, correct, or delete your personal data. Contact us through our <a href="https://discord.gg/CyyPTwY9Mq" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Discord server</a> to exercise these rights.</p>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
};

export default Privacy;