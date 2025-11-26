"use client";

import React from "react";

interface DateTimeProps {
  value?: string | Date | null;
  className?: string;
  format?: "full" | "date" | "time";
}

export const DateTime: React.FC<DateTimeProps> = ({
  value,
  className,
  format = "full",
}) => {
  // Handle null, undefined, or empty string values
  if (!value) return <span className={className}>—</span>;
  
  // Handle various date formats (including ISO string like "2025-10-29T15:23:24.284Z")
  let date: Date;
  try {
    // If it's already a Date object, use it directly
    if (value instanceof Date) {
      date = value;
    } else if (typeof value === 'string') {
      // Handle string values including ISO format
      date = new Date(value);
    } else {
      return <span className={className}>Invalid Date</span>;
    }

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return <span className={className}>Invalid Date</span>;
    }

    const options: Intl.DateTimeFormatOptions = {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "long",
      day: "numeric",
    };

    if (format === "full") {
      Object.assign(options, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    } else if (format === "time") {
      Object.assign(options, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
      delete options.year;
      delete options.month;
      delete options.day;
    }

    const formatted = date.toLocaleString("en-PH", options);

    return <span className={className}>{formatted}</span>;
  } catch (error) {
    return <span className={className}>Invalid Date</span>;
  }
};
