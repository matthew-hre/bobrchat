"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

// Module-level flag to track if the app has been loaded before
// This persists across component re-renders and navigation
let hasAppLoaded = false;

type ScrollOptions = {
  shouldScroll?: boolean;
  threadId?: string;
};

export function useChatScroll(
  messages: unknown[],
  options: ScrollOptions = {},
) {
  const { shouldScroll = true, threadId } = options;
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // If app has already loaded, skip the animation entirely
  const [isInitialScrollComplete, setIsInitialScrollComplete] = useState(hasAppLoaded);
  const prevThreadIdRef = useRef<string | undefined>(threadId);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (!shouldScroll || !messagesEndRef.current)
      return;

    const scrollContainer = scrollRef.current;
    if (!scrollContainer)
      return;

    // Use requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView();
    });
  }, [messages, shouldScroll]);

  // Scroll to bottom synchronously on thread switch to prevent flicker
  // useLayoutEffect runs before paint, so the scroll happens before user sees anything
  useLayoutEffect(() => {
    if (!shouldScroll || !messagesEndRef.current)
      return;

    const scrollContainer = scrollRef.current;
    if (!scrollContainer)
      return;

    // On thread switch, scroll immediately before paint
    const isThreadSwitch = prevThreadIdRef.current !== undefined && prevThreadIdRef.current !== threadId;
    if (isThreadSwitch) {
      messagesEndRef.current?.scrollIntoView();
      prevThreadIdRef.current = threadId;
      return;
    }

    prevThreadIdRef.current = threadId;
  }, [shouldScroll, threadId]);

  // On initial mount, scroll to bottom without animation
  useEffect(() => {
    if (!shouldScroll || !messagesEndRef.current || isInitialScrollComplete)
      return;

    const scrollContainer = scrollRef.current;
    if (!scrollContainer)
      return;

    // Use setTimeout to ensure first render is complete
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView();
      setIsInitialScrollComplete(true);
      // Mark app as loaded after first animation completes
      hasAppLoaded = true;
    }, 0);

    return () => clearTimeout(timer);
  }, [shouldScroll, isInitialScrollComplete]);

  return {
    scrollRef,
    messagesEndRef,
    isInitialScrollComplete,
  };
}
