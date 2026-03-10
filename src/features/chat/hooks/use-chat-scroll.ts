"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

let hasAppLoaded = false;

const SCROLL_THRESHOLD = 100;

type ScrollOptions = {
  shouldScroll?: boolean;
  threadId?: string;
};

function isNearBottom(container: HTMLElement, threshold: number = SCROLL_THRESHOLD): boolean {
  const { scrollTop, scrollHeight, clientHeight } = container;
  return scrollHeight - scrollTop - clientHeight <= threshold;
}

export function useChatScroll(
  messages: unknown[],
  options: ScrollOptions = {},
) {
  const { shouldScroll = true, threadId } = options;
  const scrollRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isInitialScrollComplete, setIsInitialScrollComplete] = useState(hasAppLoaded);
  const prevThreadIdRef = useRef<string | undefined>(threadId);
  const isUserNearBottomRef = useRef(true);
  const scrollToBottomRef = useRef<(() => void) | null>(null);
  // Counter-based flag: > 0 means a programmatic scroll is in flight.
  // Using a counter instead of a boolean avoids races when multiple
  // programmatic scrolls overlap (e.g. rapid onChange from ResizeObserver).
  const programmaticScrollCountRef = useRef(0);

  const registerScrollToBottom = useCallback((fn: () => void) => {
    scrollToBottomRef.current = fn;
  }, []);

  const scrollToBottom = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport)
      return;
    programmaticScrollCountRef.current++;
    viewport.scrollTop = viewport.scrollHeight - viewport.clientHeight;
    // Reset after the scroll event fires
    requestAnimationFrame(() => {
      programmaticScrollCountRef.current = Math.max(0, programmaticScrollCountRef.current - 1);
    });
  }, []);

  const handleScroll = useCallback((e: Event) => {
    // Ignore programmatic scrolls — only user gestures can un-pin
    if (programmaticScrollCountRef.current > 0)
      return;
    const viewport = e.target as HTMLElement;
    if (!viewport)
      return;
    isUserNearBottomRef.current = isNearBottom(viewport);
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport)
      return;

    viewport.addEventListener("scroll", handleScroll, { passive: true });
    return () => viewport.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Auto-scroll on new messages when user is near bottom
  useEffect(() => {
    if (!shouldScroll)
      return;

    if (!isUserNearBottomRef.current)
      return;

    requestAnimationFrame(() => {
      scrollToBottom();
    });
  }, [messages, shouldScroll, scrollToBottom]);

  // Thread switch: instant scroll to bottom
  useLayoutEffect(() => {
    if (!shouldScroll)
      return;

    const isThreadSwitch = prevThreadIdRef.current !== undefined && prevThreadIdRef.current !== threadId;
    if (isThreadSwitch) {
      scrollToBottom();
      isUserNearBottomRef.current = true;
      prevThreadIdRef.current = threadId;
      return;
    }

    prevThreadIdRef.current = threadId;
  }, [shouldScroll, threadId, scrollToBottom]);

  // Initial load: scroll to bottom after first render
  useEffect(() => {
    if (!shouldScroll || isInitialScrollComplete)
      return;

    const timer = setTimeout(() => {
      scrollToBottom();
      setIsInitialScrollComplete(true);
      hasAppLoaded = true;
    }, 0);

    return () => clearTimeout(timer);
  }, [shouldScroll, isInitialScrollComplete, scrollToBottom]);

  return {
    scrollRef,
    viewportRef,
    isInitialScrollComplete,
    isUserNearBottomRef,
    registerScrollToBottom,
    scrollToBottom,
  };
}
