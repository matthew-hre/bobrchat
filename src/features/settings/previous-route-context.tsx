"use client";

import { usePathname } from "next/navigation";
import { createContext, use, useEffect, useState } from "react";

type PreviousRouteContextType = {
  previousRoute: string;
  setPreviousRoute: (route: string) => void;
};

const PreviousRouteContext = createContext<PreviousRouteContextType | undefined>(undefined);

export function PreviousRouteProvider({ children }: { children: React.ReactNode }) {
  const [previousRoute, setPreviousRoute] = useState<string>("/");
  const pathname = usePathname();

  // Store the route whenever we navigate away from settings
  useEffect(() => {
    if (pathname !== "/settings") {
      setPreviousRoute(pathname);
    }
  }, [pathname]);

  return (
    <PreviousRouteContext value={{ previousRoute, setPreviousRoute }}>
      {children}
    </PreviousRouteContext>
  );
}

export function usePreviousRoute() {
  const context = use(PreviousRouteContext);
  if (!context) {
    throw new Error("usePreviousRoute must be used within PreviousRouteProvider");
  }
  return context;
}
