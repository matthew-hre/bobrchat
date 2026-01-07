import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { AuthDialog } from "~/components/auth/auth-dialog";
import { auth } from "~/lib/auth";

export default async function AuthPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session?.user) {
    redirect("/");
  }

  return (
    <div className="h-full w-full">
      <AuthDialog />
    </div>
  );
}
