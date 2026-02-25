import { getSignUpUrl, withAuth } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";

export default async function AuthPage() {
  const { user } = await withAuth();

  if (user) {
    redirect("/");
  }

  const url = await getSignUpUrl();
  redirect(url);
}
