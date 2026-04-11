import { motion } from "framer-motion";
import { Heart, ExternalLink } from "lucide-react";
import antilarpers from "@/assets/team/antilarpers.png";
import krgostosin from "@/assets/team/krgostosin.png";

const DISCORD_INVITE = "https://discord.gg/CyyPTwY9Mq";

const teamMembers = [
  {
    name: "antilarpers",
    discord: "@antilarpers",
    role: "Developer",
    avatar: antilarpers,
  },
  {
    name: "krgostosin",
    discord: "@krgostosin",
    role: "Founder",
    avatar: krgostosin,
  },
];

const TeamCredits = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-card/30 to-transparent" />
      
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 text-primary mb-4">
            <Heart className="w-5 h-5 fill-primary" />
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Built by <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Our Team</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm">
            Thank you to everyone who contributed to making Wbhf Auth what it is today.
          </p>
        </motion.div>

        <div className="flex flex-wrap items-center justify-center gap-8 max-w-3xl mx-auto">
          {teamMembers.map((member, index) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group"
            >
              <div className="flex flex-col items-center gap-3 p-6 rounded-2xl glass border border-border/50 hover:border-primary/30 transition-all w-48">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-border group-hover:border-primary/50 transition-colors">
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-foreground text-sm">{member.name}</p>
                  <p className="text-xs text-primary/80">{member.discord}</p>
                  <p className="text-xs text-muted-foreground mt-1">{member.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center mt-12"
        >
          <a
            href={DISCORD_INVITE}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Join our Discord community
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default TeamCredits;