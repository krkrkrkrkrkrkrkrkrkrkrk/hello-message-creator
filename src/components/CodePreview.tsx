import { motion } from "framer-motion";

const CodePreview = () => {
  return (
    <section className="py-32 relative overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-primary font-medium text-sm uppercase tracking-wider">Easy Integration</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold mt-4 mb-6">
              Integrate in <span className="text-gradient">Minutes</span>
            </h2>
            <p className="text-muted-foreground mb-8">
              Our simple Lua API makes it incredibly easy to protect your scripts. 
              Just a few lines of code and you're fully secured.
            </p>

            <div className="space-y-4">
              <Feature title="Simple API" description="Clean, well-documented API that's easy to understand" />
              <Feature title="Async Support" description="Non-blocking authentication for smooth user experience" />
              <Feature title="Error Handling" description="Comprehensive error codes and helpful messages" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            {/* Glow Effect */}
            <div className="absolute -inset-4 bg-primary/20 rounded-3xl blur-2xl opacity-50" />
            
            <div className="relative glass-strong rounded-2xl overflow-hidden">
              {/* Window Header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
                <span className="text-xs text-muted-foreground ml-2">main.lua</span>
              </div>

              {/* Code Content */}
              <pre className="p-6 text-sm overflow-x-auto">
                <code className="language-lua">
                  <Line num={1}><Keyword>local</Keyword> ShadowAuth = <Func>loadstring</Func>(<Func>game</Func>:</Line>
                  <Line num={2}>    <Func>HttpGet</Func>(<String>"https://shadowauth.dev/loader"</String>))()</Line>
                  <Line num={3} />
                  <Line num={4}><Comment>-- Initialize with your project key</Comment></Line>
                  <Line num={5}><Keyword>local</Keyword> auth = ShadowAuth.<Func>new</Func>({`{`}</Line>
                  <Line num={6}>    projectKey = <String>"your-project-key"</String>,</Line>
                  <Line num={7}>    hwid = <Keyword>true</Keyword></Line>
                  <Line num={8}>{`}`})</Line>
                  <Line num={9} />
                  <Line num={10}><Comment>-- Authenticate the user</Comment></Line>
                  <Line num={11}><Keyword>local</Keyword> success = auth:<Func>authenticate</Func>(licenseKey)</Line>
                  <Line num={12} />
                  <Line num={13}><Keyword>if</Keyword> success <Keyword>then</Keyword></Line>
                  <Line num={14}>    <Func>print</Func>(<String>"✓ Authentication successful!"</String>)</Line>
                  <Line num={15}>    <Comment>-- Your protected code here</Comment></Line>
                  <Line num={16}><Keyword>end</Keyword></Line>
                </code>
              </pre>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const Feature = ({ title, description }: { title: string; description: string }) => (
  <div className="flex items-start gap-4">
    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
    <div>
      <h4 className="font-medium">{title}</h4>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  </div>
);

const Line = ({ num, children }: { num: number; children?: React.ReactNode }) => (
  <div className="flex">
    <span className="w-8 text-muted-foreground/50 select-none">{num}</span>
    <span className="text-foreground/90">{children}</span>
  </div>
);

const Keyword = ({ children }: { children: React.ReactNode }) => (
  <span className="text-primary">{children}</span>
);

const Func = ({ children }: { children: React.ReactNode }) => (
  <span className="text-blue-400">{children}</span>
);

const String = ({ children }: { children: React.ReactNode }) => (
  <span className="text-green-400">{children}</span>
);

const Comment = ({ children }: { children: React.ReactNode }) => (
  <span className="text-muted-foreground italic">{children}</span>
);

export default CodePreview;
