"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SettingsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home since settings is now accessible via ?settings param
    router.push("/?settings=profile");
  }, [router]);

  return null;
}
