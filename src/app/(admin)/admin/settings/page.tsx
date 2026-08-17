import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/admin/ui";
import SettingsClient from "./SettingsClient";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();
  return (
    <>
      <PageHeader title="Settings" description="Business details, the receipt, and how the app looks." />
      <SettingsClient settings={settings} />
    </>
  );
}
