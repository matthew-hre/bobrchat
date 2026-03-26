import type { Metadata } from "next";

import { SettingsPage } from "~/features/settings/components/settings-page";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{
  tab?: string;
  section?: string;
}>;

export default async function SettingsRoute({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { tab, section } = await searchParams;
  const initialSection = section ?? tab ?? "theme";

  return (
    <div className="flex h-screen w-screen">
      <SettingsPage initialTab={initialSection} />
    </div>
  );
}
