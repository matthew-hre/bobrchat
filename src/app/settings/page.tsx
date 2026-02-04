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
  const validTabs = ["interface", "preferences", "integrations", "models", "attachments", "auth"];
  const initialTab = validTabs.includes(tab ?? "") ? (tab as "interface" | "preferences" | "integrations" | "models" | "attachments" | "auth") : "interface";

  return (
    <div className="flex h-screen w-screen">
      <SettingsPage initialTab={initialTab} />
    </div>
  );
}
