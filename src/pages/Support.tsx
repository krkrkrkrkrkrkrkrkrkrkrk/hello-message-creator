import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Shield, ArrowLeft, MessageCircle, Send, Clock, CheckCircle, 
  AlertCircle, Loader2, Headphones, Mail, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface FAQ {
  question: string;
  answer: string;
}

const faqs: FAQ[] = [
  {
    question: "How do I generate license keys?",
    answer: "Go to your Dashboard, select a script, and click on 'Manage Keys'. From there you can generate, delete, and manage all your license keys."
  },
  {
    question: "How does HWID locking work?",
    answer: "When a user first uses a key, their Hardware ID (HWID) is automatically recorded. The key will only work on that specific device. You can reset the HWID from the key management page."
  },
  {
    question: "Can I ban users who are abusing my script?",
    answer: "Yes! In the key management page, you can ban any key instantly. The user will no longer be able to use that key."
  },
  {
    question: "How do I view my script execution statistics?",
    answer: "Navigate to the Statistics page from your dashboard sidebar. You'll see charts showing executions over time and server status."
  },
];

const Support = () => {
  const navigate = useNavigate();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message) {
      toast.error("Please fill in all fields");
      return;
    }

    setSending(true);
    // Simulate sending
    await new Promise(resolve => setTimeout(resolve, 1500));
    toast.success("Message sent! We'll get back to you within 24 hours.");
    setSubject("");
    setMessage("");
    setSending(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold">
              Shadow<span className="text-primary">Auth</span>
            </span>
          </div>
          <span className="text-muted-foreground">/ Support</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* 24/7 Support Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-6 border border-primary/30 bg-gradient-to-br from-primary/5 to-transparent mb-8"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-primary/20 flex items-center justify-center">
              <Headphones className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-1">24/7 Support Available</h1>
              <p className="text-muted-foreground">
                Our team is here to help you around the clock. Average response time: &lt; 2 hours
              </p>
            </div>
            <div className="ml-auto hidden sm:flex items-center gap-2 text-green-500">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium">Online</span>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-2xl p-6 border border-border/50"
          >
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              Send a Message
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Subject</label>
                <Input
                  placeholder="What do you need help with?"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="bg-background/50"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Message</label>
                <Textarea
                  placeholder="Describe your issue in detail..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="bg-background/50 min-h-[150px]"
                />
              </div>

              <Button type="submit" className="w-full" variant="glow" disabled={sending}>
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Send Message
              </Button>
            </form>

            {/* Contact options */}
            <div className="mt-6 pt-6 border-t border-border/50 space-y-3">
              <a
                href="mailto:support@shadowauth.com"
                className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail className="w-4 h-4" />
                support@shadowauth.com
              </a>
              <a
                href="https://discord.gg/shadowauth"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Join our Discord
              </a>
            </div>
          </motion.div>

          {/* FAQ Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card rounded-2xl p-6 border border-border/50"
          >
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-primary" />
              Frequently Asked Questions
            </h2>

            <div className="space-y-3">
              {faqs.map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="border border-border/50 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                    className="w-full p-4 text-left flex items-center justify-between hover:bg-muted/20 transition-colors"
                  >
                    <span className="font-medium">{faq.question}</span>
                    <motion.span
                      animate={{ rotate: expandedFaq === index ? 180 : 0 }}
                      className="text-muted-foreground"
                    >
                      ▼
                    </motion.span>
                  </button>
                  {expandedFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-4 pb-4 text-muted-foreground text-sm"
                    >
                      {faq.answer}
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Response time info */}
            <div className="mt-6 pt-6 border-t border-border/50">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Response Times</p>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      Critical issues: &lt; 1 hour
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      General inquiries: &lt; 24 hours
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      Feature requests: 2-3 business days
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Support;
