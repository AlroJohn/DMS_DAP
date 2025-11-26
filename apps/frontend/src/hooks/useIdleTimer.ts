import { useEffect, useState, useCallback, useRef } from "react";

interface UseIdleTimerOptions {
  /**
   * Timeout in milliseconds before user is considered idle
   * @default 1200000 (20 minutes)
   */
  timeout?: number;
  /**
   * Warning time in milliseconds before timeout
   * @default 120000 (2 minutes)
   */
  warningTime?: number;
  /**
   * Callback when user becomes idle
   */
  onIdle?: () => void;
  /**
   * Callback when warning period starts
   */
  onWarning?: (timeRemaining: number) => void;
  /**
   * Callback when user becomes active again
   */
  onActive?: () => void;
  /**
   * Events that reset the timer
   * @default ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
   */
  events?: string[];
  /**
   * Whether the timer is enabled
   * @default true
   */
  enabled?: boolean;
}

export function useIdleTimer({
  timeout = 1200000, // 20 minutes default
  warningTime = 120000, // 2 minutes warning
  onIdle,
  onWarning,
  onActive,
  events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'],
  enabled = true,
}: UseIdleTimerOptions = {}) {
  const [isIdle, setIsIdle] = useState(false);
  const [isWarning, setIsWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(timeout);

  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const warningIdRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIdRef = useRef<NodeJS.Timeout | null>(null);
  const lastActiveRef = useRef<number>(Date.now());

  const clearTimers = useCallback(() => {
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
    if (warningIdRef.current) {
      clearTimeout(warningIdRef.current);
      warningIdRef.current = null;
    }
    if (countdownIdRef.current) {
      clearInterval(countdownIdRef.current);
      countdownIdRef.current = null;
    }
  }, []);

  const handleIdle = useCallback(() => {
    setIsIdle(true);
    setIsWarning(false);
    clearTimers();
    onIdle?.();
  }, [onIdle, clearTimers]);

  const handleWarning = useCallback(() => {
    setIsWarning(true);
    const warningStartTime = Date.now();

    // Start countdown
    countdownIdRef.current = setInterval(() => {
      const elapsed = Date.now() - warningStartTime;
      const remaining = warningTime - elapsed;

      if (remaining <= 0) {
        setRemainingTime(0);
        handleIdle();
      } else {
        setRemainingTime(remaining);
        onWarning?.(remaining);
      }
    }, 1000);
  }, [warningTime, onWarning, handleIdle]);

  const reset = useCallback(() => {
    clearTimers();
    lastActiveRef.current = Date.now();

    if (isIdle) {
      setIsIdle(false);
      onActive?.();
    }

    if (isWarning) {
      setIsWarning(false);
    }

    setRemainingTime(timeout);

    if (!enabled) return;

    // Set warning timer
    warningIdRef.current = setTimeout(() => {
      handleWarning();
    }, timeout - warningTime);

    // Set idle timer
    timeoutIdRef.current = setTimeout(() => {
      handleIdle();
    }, timeout);
  }, [enabled, timeout, warningTime, isIdle, isWarning, onActive, handleWarning, handleIdle, clearTimers]);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      return;
    }

    // Initial setup
    reset();

    // Add event listeners
    events.forEach((event) => {
      window.addEventListener(event, reset, { passive: true });
    });

    // Cleanup
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, reset);
      });
      clearTimers();
    };
  }, [enabled, events, reset, clearTimers]);

  const pause = useCallback(() => {
    clearTimers();
  }, [clearTimers]);

  const resume = useCallback(() => {
    reset();
  }, [reset]);

  return {
    isIdle,
    isWarning,
    remainingTime,
    reset,
    pause,
    resume,
    getRemainingTime: () => remainingTime,
    getLastActiveTime: () => lastActiveRef.current,
  };
}

// Helper function to format remaining time
export function formatRemainingTime(milliseconds: number): string {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
