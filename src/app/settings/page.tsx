"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home since settings is now accessible via ?settings param
    router.push("/");
  }, [router]);

  return null;
}
