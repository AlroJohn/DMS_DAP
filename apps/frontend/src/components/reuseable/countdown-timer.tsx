"use client";

import { useEffect, useState } from "react";

type DurationUnit = "seconds" | "minutes" | "hours" | "days";

type CountdownTimerProps = {
  startAt: string;
  durationValue?: number | null;
  durationUnit?: string | null;
  className?: string;
};

type ElapsedTimerProps = {
  startAt: string;
  endAt?: string | null;
  className?: string;
};

const UNIT_TO_SECONDS: Record<DurationUnit, number> = {
  seconds: 1,
  minutes: 60,
  hours: 60 * 60,
  days: 24 * 60 * 60,
};

const subscribers = new Set<(now: number) => void>();
let intervalId: ReturnType<typeof setInterval> | null = null;

const subscribe = (listener: (now: number) => void) => {
  subscribers.add(listener);
  if (!intervalId) {
    intervalId = setInterval(() => {
      const now = Date.now();
      subscribers.forEach((cb) => cb(now));
    }, 1000);
  }

  return () => {
    subscribers.delete(listener);
    if (subscribers.size === 0 && intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
};

const useSharedNow = () => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    return subscribe(setNow);
  }, []);

  return now;
};

const formatDuration = (totalSeconds: number) => {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(clamped / UNIT_TO_SECONDS.days);
  const hours = Math.floor((clamped % UNIT_TO_SECONDS.days) / UNIT_TO_SECONDS.hours);
  const minutes = Math.floor((clamped % UNIT_TO_SECONDS.hours) / UNIT_TO_SECONDS.minutes);
  const seconds = clamped % UNIT_TO_SECONDS.minutes;

  const pad = (value: number) => String(value).padStart(2, "0");
  return `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
};

const getTotalSeconds = (durationValue?: number | null, durationUnit?: string | null) => {
  if (!durationValue || durationValue <= 0) return 0;
  const unit = (durationUnit || "days").toLowerCase() as DurationUnit;
  const multiplier = UNIT_TO_SECONDS[unit] ?? UNIT_TO_SECONDS.days;
  return durationValue * multiplier;
};

export function CountdownTimer({
  startAt,
  durationValue,
  durationUnit,
  className,
}: CountdownTimerProps) {
  const now = useSharedNow();
  const totalSeconds = getTotalSeconds(durationValue, durationUnit);

  if (!startAt || !totalSeconds) {
    return null;
  }

  const startMs = new Date(startAt).getTime();
  if (Number.isNaN(startMs)) {
    return null;
  }

  const remainingSeconds = Math.max(
    0,
    Math.floor((startMs + totalSeconds * 1000 - now) / 1000)
  );

  const formatted = formatDuration(remainingSeconds);

  return (
    <span className={className} title={formatted}>
      {formatted}
    </span>
  );
}

export function ElapsedTimer({ startAt, endAt, className }: ElapsedTimerProps) {
  const now = useSharedNow();
  if (!startAt) {
    return null;
  }

  const startMs = new Date(startAt).getTime();
  if (Number.isNaN(startMs)) {
    return null;
  }

  const endMs = endAt ? new Date(endAt).getTime() : null;
  const effectiveEndMs =
    endMs && !Number.isNaN(endMs) ? endMs : now;
  const elapsedSeconds = Math.max(
    0,
    Math.floor((effectiveEndMs - startMs) / 1000)
  );
  const formatted = formatDuration(elapsedSeconds);

  return (
    <span className={className} title={formatted}>
      {formatted}
    </span>
  );
}
