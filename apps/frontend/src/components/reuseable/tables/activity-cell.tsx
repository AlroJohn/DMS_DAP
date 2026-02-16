"use client";

import { Calendar, Clock } from "lucide-react";
import { convertDateTime } from "@/lib/convertDateTime";
import { CountdownTimer, ElapsedTimer } from "@/components/reuseable/countdown-timer";

type ProcessTypeMap = Record<
  string,
  { name?: string; duration_value?: number | null; duration_unit?: string | null }
>;

type ActivityDocument = {
  activityTime?: string | null;
  created_at?: string | null;
  process_timer_start_at?: string | null;
  process_timer_complete_at?: string | null;
  process_delay_seconds?: number | null;
  process_delayed_at?: string | null;
  process_status?: "ongoing" | "delayed" | "completed" | string | null;
  process_type_id?: string | null;
  processTypeId?: string | null;
};

const formatDuration = (totalSeconds: number) => {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(clamped / 86400);
  const hours = Math.floor((clamped % 86400) / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;

  const pad = (value: number) => String(value).padStart(2, "0");
  return `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
};

export function ActivityCell({
  document,
  processTypeMap = {},
}: {
  document: ActivityDocument;
  processTypeMap?: ProcessTypeMap;
}) {
  const formattedActivityDate = document.activityTime
    ? convertDateTime(document.activityTime, { dateOnly: true })
    : "";
  const processTypeId = document.processTypeId || document.process_type_id || "";
  const record = processTypeId ? processTypeMap[processTypeId] : undefined;
  const durationValue = record?.duration_value ?? null;
  const durationUnit = (record?.duration_unit || "days").toLowerCase();
  const startAt = document.process_timer_start_at || null;
  const completedAt = document.process_timer_complete_at;
  const delaySeconds = document.process_delay_seconds ?? null;
  const hasDelayedAt = Boolean(document.process_delayed_at);
  const durationMultiplier =
    durationUnit === "seconds"
      ? 1
      : durationUnit === "minutes"
        ? 60
        : durationUnit === "hours"
          ? 60 * 60
          : 24 * 60 * 60;
  const durationSeconds =
    durationValue && durationValue > 0 ? durationValue * durationMultiplier : null;
  const computedDelayStartAt =
    !document.process_delayed_at && startAt && durationSeconds
      ? new Date(new Date(startAt).getTime() + durationSeconds * 1000).toISOString()
      : null;
  const delayStartAt = document.process_delayed_at || computedDelayStartAt;
  const resolvedDelaySeconds =
    delaySeconds && delaySeconds > 0
      ? delaySeconds
      : delayStartAt
        ? Math.max(
            0,
            Math.floor(
              ((completedAt ? new Date(completedAt) : new Date()).getTime() -
                new Date(delayStartAt).getTime()) /
                1000
            )
          )
        : null;
  const isDelayed =
    document.process_status === "delayed" ||
    hasDelayedAt ||
    (resolvedDelaySeconds !== null && resolvedDelaySeconds > 0);
  const isCompleted =
    !isDelayed &&
    (document.process_status === "completed" || Boolean(completedAt));
  const completedDurationSeconds =
    completedAt && startAt
      ? Math.max(
          0,
          Math.floor(
            (new Date(completedAt).getTime() - new Date(startAt).getTime()) / 1000
          )
        )
      : null;
  const showTimer = Boolean(processTypeId);
  const timerIconClass = isDelayed ? "text-red-500" : "text-emerald-500";
  const timerTextClass = isDelayed ? "text-red-500" : "text-foreground";

  return (
    <div className="flex flex-col gap-1.5 text-xs">
      <div className="flex items-center gap-1.5">
        <Calendar className="w-3 h-3 text-orange-500" />
        <span className="text-muted-foreground">Created</span>
      </div>
      {formattedActivityDate && (
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3 h-3 text-blue-500" />
          <span className="text-muted-foreground">{formattedActivityDate}</span>
        </div>
      )}
      {showTimer && (
        <div className="flex items-center gap-1.5">
          <Clock className={`w-3 h-3 ${timerIconClass}`} />
          {isDelayed ? (
            <span className={`font-medium ${timerTextClass}`}>
              Delayed for{" "}
              {delayStartAt ? (
                <ElapsedTimer startAt={delayStartAt} endAt={completedAt} />
              ) : resolvedDelaySeconds !== null ? (
                formatDuration(resolvedDelaySeconds)
              ) : (
                "0d 00h 00m 00s"
              )}
            </span>
          ) : isCompleted ? (
            <span className="text-muted-foreground">
              {completedDurationSeconds !== null
                ? `Completed in ${formatDuration(completedDurationSeconds)}`
                : "Completed"}
            </span>
          ) : startAt && durationValue ? (
            <span className={`font-medium ${timerTextClass}`}>
              <CountdownTimer
                startAt={startAt}
                durationValue={durationValue || undefined}
                durationUnit={record?.duration_unit || undefined}
                className={timerTextClass}
              />
            </span>
          ) : (
            <span className="text-muted-foreground">Waiting</span>
          )}
        </div>
      )}
    </div>
  );
}
