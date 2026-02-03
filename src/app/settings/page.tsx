import { SettingsPage } from "~/features/settings/components/settings-page";

type SearchParams = Promise<{
  tab?: string;
}>;

export default async function SettingsRoute({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { tab } = await searchParams;
  const validTabs = ["profile", "interface", "preferences", "integrations", "models", "attachments"];
  const initialTab = validTabs.includes(tab ?? "") ? (tab as "profile" | "interface" | "preferences" | "integrations" | "models" | "attachments") : "profile";

  return (
    <div className="flex h-screen w-screen">
      <SettingsPage initialTab={initialTab} />
    </div>
  );
}
