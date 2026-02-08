import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DiscordBotSetup from "@/components/settings/DiscordBotSetup";
import DiscordBotTab from "@/components/settings/DiscordBotTab";

const DiscordBot = () => {
  return (
    <DashboardLayout breadcrumb="Discord Bot" title="Discord Bot">
      <div className="max-w-4xl space-y-6">
        {/* Bot Setup Guide */}
        <DiscordBotSetup />
        
        {/* Bot Configuration */}
        <DiscordBotTab />
      </div>
    </DashboardLayout>
  );
};

export default DiscordBot;
