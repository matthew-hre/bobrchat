import { getSession } from "~/features/auth/lib/session";
import { LandingPage } from "~/features/landing/landing-page";

import { AuthenticatedHome } from "./authenticated-home";

export default async function HomePage(): Promise<React.ReactNode> {
  const session = await getSession();

  if (!session) {
    return <LandingPage />;
  }

  return <AuthenticatedHome />;
}
