"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, User, Calendar, Loader2, Building } from "lucide-react";
import { useAccessHistory } from "@/hooks/use-access.history";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AccessHistoryPage() {
  const { accessLogs, stats, isLoading, error, refetch } = useAccessHistory();

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600)
      return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)} days ago`;

    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex flex-col gap-6 p-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Access History Reports
        </h1>
        <p className="text-muted-foreground">
          Track who accessed documents and when
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Accesses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                stats?.totalAccesses.toLocaleString() || "0"
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                stats?.uniqueUsers.toLocaleString() || "0"
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Access/Day
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                stats?.avgAccessPerDay.toLocaleString() || "0"
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Access Events</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : accessLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No access history found
            </div>
          ) : (
            <div className="space-y-3">
              {accessLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-3 border-b pb-3 last:border-0"
                >
                  <Eye className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {log.document}
                      {log.documentCode && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({log.documentCode})
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{log.user}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatTimestamp(log.timestamp)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        <span>{log.department}</span>
                      </div>
                      <div className="px-2 py-0.5 bg-secondary rounded-md">
                        {log.action}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
