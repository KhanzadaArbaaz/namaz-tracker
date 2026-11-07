import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";
import PrayerTimes from "@/components/PrayerTimes";
import Tracker from "@/components/Tracker";

export default async function Home() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  return (
    <main className="container">
      <header className="topbar">
        <h1>Namaz Tracker</h1>
        <LogoutButton />
      </header>
      <PrayerTimes />
      <Tracker />
    </main>
  );
}
