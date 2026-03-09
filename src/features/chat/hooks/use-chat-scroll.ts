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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isInitialScrollComplete, setIsInitialScrollComplete] = useState(hasAppLoaded);
  const prevThreadIdRef = useRef<string | undefined>(threadId);
  const isUserNearBottomRef = useRef(true);

  const handleScroll = useCallback((e: Event) => {
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

  useEffect(() => {
    if (!shouldScroll || !messagesEndRef.current)
      return;

    const scrollContainer = scrollRef.current;
    if (!scrollContainer)
      return;

    if (!isUserNearBottomRef.current)
      return;

    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView();
    });
  }, [messages, shouldScroll]);

  useLayoutEffect(() => {
    if (!shouldScroll || !messagesEndRef.current)
      return;

    const scrollContainer = scrollRef.current;
    if (!scrollContainer)
      return;

    const isThreadSwitch = prevThreadIdRef.current !== undefined && prevThreadIdRef.current !== threadId;
    if (isThreadSwitch) {
      messagesEndRef.current?.scrollIntoView();
      isUserNearBottomRef.current = true;
      prevThreadIdRef.current = threadId;
      return;
    }

    prevThreadIdRef.current = threadId;
  }, [shouldScroll, threadId]);

  useEffect(() => {
    if (!shouldScroll || !messagesEndRef.current || isInitialScrollComplete)
      return;

    const scrollContainer = scrollRef.current;
    if (!scrollContainer)
      return;

    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView();
      setIsInitialScrollComplete(true);
      hasAppLoaded = true;
    }, 0);

    return () => clearTimeout(timer);
  }, [shouldScroll, isInitialScrollComplete]);

  return {
    scrollRef,
    viewportRef,
    messagesEndRef,
    isInitialScrollComplete,
  };
}
