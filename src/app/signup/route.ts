import { getSignUpUrl } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";

export function GET() {
  return getSignUpUrl().then(url => redirect(url));
}
