"use client";

import { signOut as workosSignOut } from "@workos-inc/authkit-nextjs";
import { useAuth } from "@workos-inc/authkit-nextjs/components";

export { workosSignOut as signOut };

/**
 * Hook that provides session data.
 * Returns { data: { user: { name, email, ... } } | null, isPending }
 */
export function useSession() {
  const { user, loading } = useAuth();

  if (loading) {
    return { data: null, isPending: true };
  }

  if (!user) {
    return { data: null, isPending: false };
  }

  return {
    data: {
      user: {
        name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.profilePictureUrl ?? null,
        twoFactorEnabled: false,
      },
    },
    isPending: false,
  };
}
