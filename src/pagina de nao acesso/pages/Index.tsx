import { ShieldX, Home, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0a0f] via-[#0d1117] to-[#151922] p-4">
      {/* Background glow effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <Card className="relative w-full max-w-md bg-[#12161c]/80 backdrop-blur-xl border border-[#2a3441]/50 shadow-2xl shadow-black/50">
        <CardContent className="p-8 text-center">
          {/* ACCESS DENIED Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 mb-6">
            <ShieldX className="w-4 h-4 text-red-400" />
            <span className="text-sm font-semibold text-red-400 tracking-wider uppercase">
              Access Denied
            </span>
          </div>

          {/* Main Title */}
          <h1 className="text-xl md:text-2xl font-bold text-white mb-3 leading-tight">
            This content is protected by ShadowAuth
          </h1>

          {/* Subtitle */}
          <p className="text-[#8b949e] text-sm mb-4">
            You don't have permission to access this content.
          </p>

          {/* Description */}
          <p className="text-[#6e7681] text-xs mb-8 leading-relaxed">
            Você não tem permissão para visualizar este conteúdo no navegador. Protegido contra acesso não autorizado, reverse engineering e tampering.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              variant="outline" 
              className="bg-[#1c2128] border-[#2a3441] text-[#c9d1d9] hover:bg-[#262c36] hover:border-[#3a4451] hover:text-white transition-all duration-200"
            >
              <Home className="w-4 h-4 mr-2" />
              Return Home
            </Button>
            
            <Button 
              className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white border-0 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-200"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Contact ShadowAuth
            </Button>
          </div>

          {/* Licensing Footer */}
          <div className="mt-8 pt-6 border-t border-[#2a3441]/50">
            <p className="text-[#484f58] text-[10px] uppercase tracking-widest">
              Protected by <span className="text-blue-400 font-semibold">ShadowAuth</span> • Licensed Security
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
