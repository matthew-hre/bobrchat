"use client";

import { useQuery } from "@tanstack/react-query";
import { HardDriveIcon, LoaderIcon } from "lucide-react";

import { Progress } from "~/components/ui/progress";

export function StorageQuotaWidget() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["storageQuota"],
    queryFn: async () => {
      const res = await fetch("/api/attachments/quota");
      if (!res.ok)
        throw new Error("Failed to load quota");
      return res.json() as Promise<{ used: number; quota: number }>;
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <>
        <LoaderIcon className="text-muted-foreground size-3 animate-spin" />
        Loading storage...
      </>
    );
  }

  if (isError || !data) {
    return (
      <>
        <HardDriveIcon className="text-muted-foreground size-3" />
        Storage unavailable
      </>
    );
  }

  const percent = Math.min(100, (data.used / data.quota) * 100);
  const usedMB = (data.used / 1024 / 1024).toFixed(1);
  const quotaMB = (data.quota / 1024 / 1024).toFixed(0);

  return (
    <div className="flex w-full items-center gap-2">
      <HardDriveIcon className="text-muted-foreground size-3 shrink-0" />
      <Progress value={percent} className="h-1.5 flex-1" />
      <span className="shrink-0">
        {usedMB}
        /
        {quotaMB}
        {" MB"}
      </span>
    </div>
  );
}
