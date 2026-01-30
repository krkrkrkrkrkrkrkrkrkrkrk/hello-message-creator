import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Bot, 
  Copy, 
  Check, 
  ExternalLink, 
  Key, 
  Shield, 
  Link2,
  Terminal,
  AlertCircle,
  ArrowRight,
  Zap,
  MessageSquare,
  Users,
  Sparkles,
  Save,
  Eye,
  EyeOff,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const DiscordBotTab = () => {
  const [copied, setCopied] = useState<string | null>(null);
  const [botToken, setBotToken] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [showPublicKey, setShowPublicKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasExistingConfig, setHasExistingConfig] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const interactionsUrl = `${supabaseUrl}/functions/v1/discord-bot`;
  const registerCommandsUrl = `${supabaseUrl}/functions/v1/register-discord-commands`;

  useEffect(() => {
    loadExistingConfig();
  }, []);

  const loadExistingConfig = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: config } = await supabase
        .from("discord_servers")
        .select("bot_token, public_key")
        .eq("user_id", user.id)
        .maybeSingle();

      if (config) {
        setHasExistingConfig(true);
        if (config.bot_token) setBotToken(config.bot_token);
        if (config.public_key) setPublicKey(config.public_key);
      }
    } catch (error) {
      console.error("Error loading config:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveCredentials = async () => {
    if (!botToken.trim() || !publicKey.trim()) {
      toast.error("Por favor, preencha ambos os campos");
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Você precisa estar logado");
        return;
      }

      // Check if user already has a config
      const { data: existingConfig } = await supabase
        .from("discord_servers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingConfig) {
        // Update existing
        const { error } = await supabase
          .from("discord_servers")
          .update({
            bot_token: botToken.trim(),
            public_key: publicKey.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingConfig.id);

        if (error) throw error;
      } else {
        // Get user's API key for the new config
        const { data: profile } = await supabase
          .from("profiles")
          .select("api_key")
          .eq("id", user.id)
          .single();

        if (!profile?.api_key) {
          toast.error("Por favor, gere uma API key primeiro na aba Developer");
          return;
        }

        // Create new config with a placeholder guild_id (will be updated when bot joins a server)
        const { error } = await supabase
          .from("discord_servers")
          .insert({
            user_id: user.id,
            api_key: profile.api_key,
            guild_id: `pending_${user.id}`,
            bot_token: botToken.trim(),
            public_key: publicKey.trim(),
          });

        if (error) throw error;
      }

      setHasExistingConfig(true);
      toast.success("Credenciais do bot salvas com sucesso!");
    } catch (error: any) {
      console.error("Error saving credentials:", error);
      toast.error(error.message || "Erro ao salvar credenciais");
    } finally {
      setIsSaving(false);
    }
  };

  const registerCommands = async () => {
    if (!botToken.trim()) {
      toast.error("Por favor, salve o Bot Token primeiro");
      return;
    }

    setIsRegistering(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Você precisa estar logado");
        return;
      }

      const response = await supabase.functions.invoke("register-discord-commands", {
        body: { user_id: user.id }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast.success("Comandos registrados com sucesso!");
    } catch (error: any) {
      console.error("Error registering commands:", error);
      toast.error(error.message || "Erro ao registrar comandos");
    } finally {
      setIsRegistering(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success("Copiado para a área de transferência!");
    setTimeout(() => setCopied(null), 2000);
  };

  const detailedSteps = [
    {
      step: 1,
      title: "Criar Aplicação no Discord",
      icon: Sparkles,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
      description: "Acesse o Discord Developer Portal e crie uma nova aplicação",
      details: [
        "Acesse discord.com/developers/applications",
        "Clique em 'New Application' no canto superior direito",
        "Dê um nome para sua aplicação (ex: Meu Hub Bot)",
        "Aceite os termos de serviço e clique em 'Create'",
      ],
      link: "https://discord.com/developers/applications",
      linkText: "Abrir Discord Developer Portal",
      warning: null,
    },
    {
      step: 2,
      title: "Copiar Public Key",
      icon: Key,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/20",
      description: "Copie a Public Key da sua aplicação",
      details: [
        "Na página 'General Information' da sua aplicação",
        "Localize o campo 'PUBLIC KEY'",
        "Clique em 'Copy' ou copie manualmente",
        "Cole no campo 'Discord Public Key' acima",
      ],
      warning: "⚠️ A Public Key é diferente do Bot Token! Não confunda as duas.",
      image: null,
    },
    {
      step: 3,
      title: "Criar o Bot e Copiar Token",
      icon: Bot,
      color: "text-[#5865F2]",
      bgColor: "bg-[#5865F2]/10",
      borderColor: "border-[#5865F2]/20",
      description: "Crie o bot e copie o token",
      details: [
        "No menu lateral, clique em 'Bot'",
        "Clique em 'Add Bot' e confirme",
        "Em 'TOKEN', clique em 'Reset Token' para gerar um novo",
        "Copie o token imediatamente (ele só aparece uma vez!)",
        "Cole no campo 'Discord Bot Token' acima",
        "Ative 'MESSAGE CONTENT INTENT' se quiser ler mensagens",
      ],
      warning: "🔒 NUNCA compartilhe seu Bot Token! Ele dá acesso total ao seu bot.",
    },
    {
      step: 4,
      title: "Salvar Credenciais",
      icon: Save,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/20",
      description: "Salve as credenciais no sistema",
      details: [
        "Preencha o Bot Token e a Public Key nos campos acima",
        "Clique em 'Salvar Credenciais do Bot'",
        "Aguarde a confirmação de sucesso",
      ],
      warning: null,
    },
    {
      step: 5,
      title: "Configurar Interactions Endpoint URL",
      icon: Link2,
      color: "text-primary",
      bgColor: "bg-primary/10",
      borderColor: "border-primary/20",
      description: "Cole a URL de interações na sua aplicação Discord",
      details: [
        "Volte para 'General Information' no Developer Portal",
        "Role até encontrar 'INTERACTIONS ENDPOINT URL'",
        "Cole a URL abaixo no campo",
        "Clique fora do campo ou pressione Enter para salvar",
        "O Discord vai validar a URL automaticamente",
        "Se aparecer um check verde ✓, está tudo certo!",
      ],
      copyValue: interactionsUrl,
      copyLabel: "Interactions Endpoint URL",
      warning: "⚠️ Você DEVE salvar as credenciais (Passo 4) ANTES de configurar esta URL!",
    },
    {
      step: 6,
      title: "Convidar Bot para o Servidor",
      icon: Users,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/20",
      description: "Gere o link de convite e adicione o bot ao seu servidor",
      details: [
        "No menu lateral, clique em 'OAuth2' > 'URL Generator'",
        "Em SCOPES, selecione: bot e applications.commands",
        "Em BOT PERMISSIONS, selecione: Administrator",
        "Copie a URL gerada no final da página",
        "Abra a URL em uma nova aba e selecione seu servidor",
        "Autorize o bot a entrar no servidor",
      ],
      oauthScopes: ["bot", "applications.commands"],
      permissions: ["Administrator"],
    },
    {
      step: 7,
      title: "Registrar Slash Commands",
      icon: Terminal,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      borderColor: "border-orange-500/20",
      description: "Registre os comandos do bot no Discord",
      details: [
        "Após salvar as credenciais e convidar o bot",
        "Clique no botão 'Registrar Comandos' acima",
        "Isso registra os slash commands (/whitelist, /blacklist, etc)",
        "Os comandos podem levar até 1 hora para aparecer globalmente",
      ],
      warning: null,
    },
  ];

  const availableCommands = [
    { name: "/login", description: "Vincular conta ShadowAuth ao servidor", params: "api_key" },
    { name: "/setproject", description: "Define o script ativo para o servidor", params: "script_id" },
    { name: "/setbuyerrole", description: "Define o cargo de comprador", params: "role" },
    { name: "/setmanagerrole", description: "Define o cargo de gerente", params: "role" },
    { name: "/whitelist", description: "Cria chave e envia por DM", params: "user, days?, note?" },
    { name: "/unwhitelist", description: "Remove acesso de um usuário", params: "user" },
    { name: "/blacklist", description: "Bane a chave do usuário", params: "user, reason?" },
    { name: "/resethwid", description: "Reseta seu próprio HWID", params: "-" },
    { name: "/force-resethwid", description: "Reseta HWID de outro usuário (manager)", params: "user" },
    { name: "/getstats", description: "Mostra estatísticas do script", params: "-" },
    { name: "/getkey", description: "Recebe o loader via DM", params: "-" },
    { name: "/redeem", description: "Resgata uma chave para seu Discord", params: "key" },
    { name: "/controlpanel", description: "Cria painel de controle com botões", params: "-" },
  ];

  const troubleshooting = [
    { 
      problem: "Interactions Endpoint URL dá erro ao salvar", 
      solution: "Certifique-se de que você salvou as credenciais (Bot Token e Public Key) ANTES de configurar a URL no Discord." 
    },
    { 
      problem: "Bot não responde aos comandos", 
      solution: "Verifique se o Bot Token e a Public Key estão corretos. Tente salvar novamente." 
    },
    { 
      problem: "Comandos não aparecem no Discord", 
      solution: "Clique em 'Registrar Comandos' novamente. Comandos globais podem levar até 1h para aparecer." 
    },
    { 
      problem: "Erro 401 Unauthorized", 
      solution: "O Bot Token está incorreto ou expirado. Gere um novo token no Developer Portal e salve novamente." 
    },
    { 
      problem: "Erro de validação de signature", 
      solution: "A Public Key está incorreta. Copie novamente da página General Information e salve." 
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-xl bg-[#5865F2]/20 flex items-center justify-center">
          <Bot className="w-7 h-7 text-[#5865F2]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Discord Bot Setup</h2>
          <p className="text-sm text-muted-foreground">
            Configure seu próprio bot Discord para gerenciar chaves
          </p>
        </div>
      </div>

      {/* Bot Credentials Form */}
      <div className="rounded-xl bg-gradient-to-br from-[#5865F2]/10 to-[#5865F2]/5 border border-[#5865F2]/30 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[#5865F2]/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-[#5865F2]" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Credenciais do Bot</h3>
            <p className="text-sm text-muted-foreground">
              {hasExistingConfig ? "Atualize" : "Configure"} as credenciais do seu bot Discord
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bot-token" className="text-sm font-medium flex items-center gap-2">
              <Key className="w-4 h-4 text-yellow-500" />
              Discord Bot Token
            </Label>
            <div className="relative">
              <Input
                id="bot-token"
                type={showToken ? "text" : "password"}
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="Cole o token do seu bot aqui..."
                className="pr-10 font-mono text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Encontrado em: Discord Developer Portal → Bot → Token
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="public-key" className="text-sm font-medium flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-500" />
              Discord Public Key
            </Label>
            <div className="relative">
              <Input
                id="public-key"
                type={showPublicKey ? "text" : "password"}
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                placeholder="Cole a public key da sua aplicação aqui..."
                className="pr-10 font-mono text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setShowPublicKey(!showPublicKey)}
              >
                {showPublicKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Encontrado em: Discord Developer Portal → General Information → Public Key
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={saveCredentials}
              disabled={isSaving || !botToken.trim() || !publicKey.trim()}
              className="flex-1 bg-[#5865F2] hover:bg-[#4752C4]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Credenciais do Bot
                </>
              )}
            </Button>

            <Button
              onClick={registerCommands}
              disabled={isRegistering || !hasExistingConfig}
              variant="outline"
              className="border-[#5865F2]/50 text-[#5865F2] hover:bg-[#5865F2]/10"
            >
              {isRegistering ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <Terminal className="w-4 h-4 mr-2" />
                  Registrar Comandos
                </>
              )}
            </Button>
          </div>

          {hasExistingConfig && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-600 dark:text-green-400">
                Credenciais configuradas! Agora configure a Interactions URL no Discord.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Copy Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Interactions Endpoint URL</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Cole em: Discord App → General Information → Interactions Endpoint URL
          </p>
          <div className="flex gap-2">
            <Input
              value={interactionsUrl}
              readOnly
              className="font-mono text-xs bg-background/50"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(interactionsUrl, "interactions")}
              className="shrink-0"
            >
              {copied === "interactions" ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="rounded-xl bg-orange-500/5 border border-orange-500/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-semibold text-orange-500">Status</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            {hasExistingConfig 
              ? "Bot configurado! Use os comandos no seu servidor."
              : "Salve as credenciais para começar a usar o bot."
            }
          </p>
          <div className={`flex items-center gap-2 p-2 rounded-lg ${hasExistingConfig ? 'bg-green-500/10 border border-green-500/20' : 'bg-yellow-500/10 border border-yellow-500/20'}`}>
            {hasExistingConfig ? (
              <>
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600 dark:text-green-400">Bot Configurado</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-yellow-600 dark:text-yellow-400">Aguardando Configuração</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Step by Step Guide */}
      <div className="rounded-xl bg-card border border-border p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-[#5865F2]/20 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-[#5865F2]" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Guia Passo a Passo</h3>
            <p className="text-sm text-muted-foreground">Siga cada etapa cuidadosamente</p>
          </div>
        </div>

        <div className="space-y-4">
          {detailedSteps.map((item, index) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`rounded-xl ${item.bgColor} border ${item.borderColor} overflow-hidden`}
            >
              <div className="p-4">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg ${item.bgColor} flex items-center justify-center shrink-0`}>
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold ${item.color} bg-background/50 px-2 py-0.5 rounded`}>
                        PASSO {item.step}
                      </span>
                      <h4 className="font-bold text-sm">{item.title}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{item.description}</p>
                    
                    {/* Details List */}
                    <ul className="space-y-1.5 mb-3">
                      {item.details.map((detail, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                          <ArrowRight className="w-3 h-3 mt-0.5 text-muted-foreground shrink-0" />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Warning */}
                    {item.warning && (
                      <div className="flex items-start gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 mb-3">
                        <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-yellow-600 dark:text-yellow-400">{item.warning}</p>
                      </div>
                    )}

                    {/* Copy Value */}
                    {item.copyValue && (
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">{item.copyLabel}:</span>
                        <div className="flex gap-2">
                          <Input
                            value={item.copyValue}
                            readOnly
                            className="font-mono text-xs bg-background/70 h-8"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(item.copyValue!, `step-${item.step}`)}
                            className="h-8 px-2"
                          >
                            {copied === `step-${item.step}` ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* OAuth Scopes */}
                    {item.oauthScopes && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className="text-xs text-muted-foreground">Scopes:</span>
                        {item.oauthScopes.map((scope) => (
                          <code key={scope} className="text-xs px-2 py-0.5 rounded bg-background/50 text-purple-500">
                            {scope}
                          </code>
                        ))}
                      </div>
                    )}

                    {/* Link */}
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-3"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {item.linkText}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Available Commands */}
      <div className="rounded-xl bg-card border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
            <Terminal className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Comandos Disponíveis</h3>
            <p className="text-sm text-muted-foreground">Todos os slash commands do bot</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {availableCommands.map((cmd) => (
            <div key={cmd.name} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <code className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded shrink-0">
                {cmd.name}
              </code>
              <div className="min-w-0">
                <p className="text-xs text-foreground/80">{cmd.description}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Params: {cmd.params}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Troubleshooting */}
      <div className="rounded-xl bg-card border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Solução de Problemas</h3>
            <p className="text-sm text-muted-foreground">Erros comuns e como resolver</p>
          </div>
        </div>

        <Accordion type="single" collapsible className="space-y-2">
          {troubleshooting.map((item, index) => (
            <AccordionItem key={index} value={`item-${index}`} className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-medium hover:no-underline">
                <span className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  {item.problem}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10">
                  <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground/80">{item.solution}</p>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </motion.div>
  );
};

export default DiscordBotTab;
