import { motion } from "framer-motion";
import { Coins, Plus, Sparkles, TrendingUp, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface TokensDisplayProps {
  plan: string | null;
  tokensUsed: number;
  tokensTotal: number;
  onBuyTokens?: () => void;
}

export default function TokensDisplay({ 
  plan, 
  tokensUsed, 
  tokensTotal, 
  onBuyTokens 
}: TokensDisplayProps) {
  const tokensLeft = tokensTotal - tokensUsed;
  const percentage = (tokensLeft / tokensTotal) * 100;

  const getPlanColor = () => {
    switch (plan?.toLowerCase()) {
      case 'enterprise': return 'bg-gradient-to-r from-purple-500 to-pink-500';
      case 'pro': return 'bg-gradient-to-r from-blue-500 to-cyan-500';
      default: return 'bg-gradient-to-r from-gray-500 to-gray-600';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-gradient-to-br from-card to-card/80 border border-border p-4"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Coins className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Plan:</span>
              <Badge className={`${getPlanColor()} text-white border-0 text-xs px-2 py-0.5`}>
                <Sparkles className="w-3 h-3 mr-1" />
                {plan || 'FREE'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Monthly Tokens Left</p>
          </div>
        </div>
        
        <Button 
          size="sm" 
          className="gap-1.5 bg-green-500 hover:bg-green-600 text-white border-0"
          onClick={onBuyTokens}
        >
          <Plus className="w-3.5 h-3.5" />
          Buy Tokens
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-3xl font-bold tracking-tight">
            {tokensLeft}
            <span className="text-base font-normal text-muted-foreground"> / {tokensTotal}</span>
          </span>
          <span className={`text-sm font-medium ${percentage > 50 ? 'text-green-500' : percentage > 20 ? 'text-yellow-500' : 'text-red-500'}`}>
            {percentage.toFixed(0)}%
          </span>
        </div>
        
        <Progress 
          value={percentage} 
          className="h-2 bg-secondary"
        />
      </div>
    </motion.div>
  );
}
