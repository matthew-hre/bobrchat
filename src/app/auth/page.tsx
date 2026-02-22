import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AuthDialog } from "~/features/auth/components/auth-dialog";
import { auth } from "~/features/auth/lib/auth";

export default async function AuthPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

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
