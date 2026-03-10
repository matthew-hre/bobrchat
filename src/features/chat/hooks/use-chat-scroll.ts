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
  // Store the viewport element in state so that consumers (e.g. the
  // virtualizer) re-render when it becomes available.  A plain ref
  // wouldn't trigger the re-render the virtualizer needs.
  const [viewportElement, setViewportElement] = useState<HTMLDivElement | null>(null);
  const viewportCallbackRef = useCallback((node: HTMLDivElement | null) => {
    viewportRef.current = node;
    setViewportElement(node);
  }, []);
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

  // Auto-scroll on new messages when user is near bottom.
  // Skip the initial mount — the initial-scroll effect handles that.
  // Uses rAF batching so rapid message-identity changes during streaming
  // (every ~75ms from useChat's throttle) collapse into one scroll per frame.
  const hasAutoScrolledRef = useRef(false);
  const autoScrollRafRef = useRef(0);
  useEffect(() => {
    if (!hasAutoScrolledRef.current) {
      hasAutoScrolledRef.current = true;
      return;
    }

    if (!shouldScroll)
      return;

    if (!isUserNearBottomRef.current)
      return;

    if (autoScrollRafRef.current)
      return;

    autoScrollRafRef.current = requestAnimationFrame(() => {
      autoScrollRafRef.current = 0;
      scrollToBottom();
    });
  }, [messages, shouldScroll, scrollToBottom]);

  useEffect(() => {
    return () => {
      if (autoScrollRafRef.current) {
        cancelAnimationFrame(autoScrollRafRef.current);
      }
    };
  }, []);

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
    viewportCallbackRef,
    viewportElement,
    isInitialScrollComplete,
    isUserNearBottomRef,
    registerScrollToBottom,
    scrollToBottom,
  };
}
