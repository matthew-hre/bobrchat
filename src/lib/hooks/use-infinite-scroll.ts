"use client";

import { useEffect, useRef, useState } from "react";

type UseInfiniteScrollOptions = {
  totalCount: number;
  pageSize?: number;
  resetKeys?: unknown[];
};

export function useInfiniteScroll({
  totalCount,
  pageSize = 30,
  resetKeys = [],
}: UseInfiniteScrollOptions) {
  const [displayedCount, setDisplayedCount] = useState(pageSize);
  const observerRef = useRef<HTMLDivElement>(null);

  // Reset displayedCount when resetKeys change
  useEffect(() => {
    setDisplayedCount(pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...resetKeys, pageSize]);

  // IntersectionObserver setup
  useEffect(() => {
    const node = observerRef.current;
    if (!node)
      return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setDisplayedCount(prev => Math.min(prev + pageSize, totalCount));
        }
      },
      { threshold: 0 },
    );

    observer.observe(node);

    return () => {
      if (node)
        observer.unobserve(node);
    };
  }, [pageSize, totalCount]);

  const hasMore = displayedCount < totalCount;

  return { displayedCount, observerRef, hasMore };
}
