import { motion } from "framer-motion";
import { Code, Copy, Check, Terminal, Zap, Shield, Key } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getFunctionsBaseUrl } from "@/lib/functions-base-url";

const APIShowcase = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const codeExamples = [
    {
      title: "Basic Loader",
      description: "Simple script execution with key validation",
      language: "lua",
      code: `script_key = "YOUR_KEY_HERE"

loadstring(game:HttpGet("${getFunctionsBaseUrl()}/loader/YOUR_SCRIPT_ID"))()`,
    },
    {
      title: "Key Validation",
      description: "Server-side key verification response",
      language: "lua",
      code: `-- Response from validate-key endpoint:
{
  "valid": true,
  "expires_at": "2025-12-31T23:59:59Z",
  "hwid_locked": true,
  "executions": 42
}`,
    },
    {
      title: "Webhook Integration",
      description: "Real-time execution notifications",
      language: "lua",
      code: `-- Automatic webhook notifications on every execution
-- Configure in your dashboard:
-- • Player username & ID
-- • Executor type detection
-- • Geographic location
-- • Custom payload data`,
    },
  ];

  const features = [
    {
      icon: Zap,
      title: "Instant Delivery",
      description: "Scripts are delivered in milliseconds with global CDN",
    },
    {
      icon: Shield,
      title: "Anti-Tamper",
      description: "Built-in protection against script modification",
    },
    {
      icon: Key,
      title: "Key System",
      description: "Flexible key management with expiration and HWID lock",
    },
  ];

  const copyToClipboard = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <section id="api" className="py-24 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] opacity-30" />
      
      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Terminal className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Developer API</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
            Simple & Powerful{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              API
            </span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Integrate ShadowAuth into your scripts with just a few lines of code.
            Our API handles authentication, key validation, and secure delivery.
          </p>
        </motion.div>

        {/* Code Examples */}
        <div className="grid lg:grid-cols-3 gap-6 mb-16">
          {codeExamples.map((example, index) => (
            <motion.div
              key={example.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group"
            >
              <div className="rounded-xl bg-card border border-border overflow-hidden h-full flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Code className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{example.title}</h3>
                      <p className="text-xs text-muted-foreground">{example.description}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => copyToClipboard(example.code, index)}
                  >
                    {copiedIndex === index ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {/* Code */}
                <div className="p-4 flex-1 bg-secondary/30">
                  <pre className="text-sm font-mono text-muted-foreground overflow-x-auto">
                    <code>{example.code}</code>
                  </pre>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-6"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="p-6 rounded-xl bg-card/50 border border-border hover:border-primary/50 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <a href="/docs">
            <Button variant="outline" size="lg" className="gap-2">
              <Terminal className="w-4 h-4" />
              View Full Documentation
            </Button>
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default APIShowcase;
