import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DiscordBotTab from "@/components/settings/DiscordBotTab";

const DiscordBot = () => {
  return (
    <DashboardLayout breadcrumb="Discord Bot" title="Discord Bot">
      <div className="max-w-4xl space-y-6">
        <DiscordBotTab />
      </div>
    </DashboardLayout>
  );
};

export default DiscordBot;
