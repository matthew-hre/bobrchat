import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AuthDialog } from "~/features/auth/components/auth-dialog";
import { getSession } from "~/features/auth/lib/session";

export default async function AuthPage() {
  const session = await getSession();

  if (session?.user) {
    redirect("/");
  }

  return (
    <div className="h-full w-full">
      <Suspense>
        <AuthDialog />
      </Suspense>
    </div>
  );
}
