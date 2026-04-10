"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { useUserSettings } from "~/features/settings/hooks/use-user-settings";

let hasAppLoaded = false;

const SCROLL_THRESHOLD = 50;

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
  const { data: settings } = useUserSettings();
  const autoScrollEnabled = settings?.autoScrollDuringGeneration ?? true;
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
  // Tracks whether the user is actively scrolling via an input gesture
  // (wheel, touch, pointer drag). While true, programmatic scrolls are
  // suppressed so even a single scroll tick can unpin.
  const userScrollingRef = useRef(false);
  const userScrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const registerScrollToBottom = useCallback((fn: () => void) => {
    scrollToBottomRef.current = fn;
  }, []);

  const scrollToBottom = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport)
      return;
    // Never fight the user — if they're actively scrolling, skip.
    if (userScrollingRef.current)
      return;
    viewport.scrollTop = viewport.scrollHeight - viewport.clientHeight;
  }, []);

  // Mark that the user is actively scrolling. Any scroll-position check
  // that fires while this flag is set will update `isUserNearBottomRef`
  // and programmatic scrolls will be skipped.
  const markUserScrolling = useCallback(() => {
    userScrollingRef.current = true;
    clearTimeout(userScrollTimeoutRef.current);
    // After 150ms of inactivity we consider the gesture finished and
    // re-evaluate the pinned state based on final scroll position.
    userScrollTimeoutRef.current = setTimeout(() => {
      userScrollingRef.current = false;
      const viewport = viewportRef.current;
      if (viewport) {
        isUserNearBottomRef.current = isNearBottom(viewport);
      }
    }, 150);
  }, []);

  const handleUserScrollGesture = useCallback(() => {
    markUserScrolling();
    const viewport = viewportRef.current;
    if (!viewport)
      return;
    isUserNearBottomRef.current = isNearBottom(viewport);
  }, [markUserScrolling]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport)
      return;

    // Listen for actual user-initiated scroll gestures only.
    // The "scroll" event fires for both programmatic and user scrolls,
    // so we avoid it and instead listen for input-level events.
    viewport.addEventListener("wheel", handleUserScrollGesture, { passive: true });
    viewport.addEventListener("touchmove", handleUserScrollGesture, { passive: true });
    viewport.addEventListener("pointerdown", handleUserScrollGesture);
    return () => {
      viewport.removeEventListener("wheel", handleUserScrollGesture);
      viewport.removeEventListener("touchmove", handleUserScrollGesture);
      viewport.removeEventListener("pointerdown", handleUserScrollGesture);
      clearTimeout(userScrollTimeoutRef.current);
    };
  }, [handleUserScrollGesture]);

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

    if (!shouldScroll || !autoScrollEnabled)
      return;

    if (!isUserNearBottomRef.current)
      return;

    if (autoScrollRafRef.current)
      return;

    autoScrollRafRef.current = requestAnimationFrame(() => {
      autoScrollRafRef.current = 0;
      scrollToBottom();
    });
  }, [messages, shouldScroll, autoScrollEnabled, scrollToBottom]);

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
