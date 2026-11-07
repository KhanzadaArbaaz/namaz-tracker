import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import AuthForm from "@/components/AuthForm";

export default async function LoginPage() {
  const userId = await getSessionUserId();
  if (userId) redirect("/");

  return (
    <main className="container narrow">
      <h1>Namaz Tracker</h1>
      <p className="muted">Keep track of your daily prayers and the ones you still need to make up.</p>
      <AuthForm />
    </main>
  );
}
