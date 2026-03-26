"use client";

import { DataManagementSection } from "../sections/data-management-section";

export function DataPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="w-full max-w-2xl space-y-8 p-6">
        <DataManagementSection />
      </div>
    </div>
  );
}
