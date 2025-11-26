"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FileText,
  Send,
  Users,
  Archive,
  Trash2,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

interface DocumentStats {
  owned: number;
  inTransit: number;
  shared: number;
  archive: number;
  recycleBin: number;
  total: number;
}

const statsConfig = [
  {
    key: "owned" as keyof DocumentStats,
    title: "Owned",
    icon: FileText,
    url: "/documents/owned",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    key: "inTransit" as keyof DocumentStats,
    title: "In-transit",
    icon: Send,
    url: "/documents/in-transit",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
  {
    key: "shared" as keyof DocumentStats,
    title: "Shared",
    icon: Users,
    url: "/documents/shared",
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    key: "archive" as keyof DocumentStats,
    title: "Archive",
    icon: Archive,
    url: "/documents/archive",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  {
    key: "recycleBin" as keyof DocumentStats,
    title: "Recycle Bin",
    icon: Trash2,
    url: "/documents/recycle-bin",
    color: "text-red-600",
    bgColor: "bg-red-50",
  },
];

interface DocumentStatsCardsProps {
  stats: DocumentStats;
}

export function DocumentStatsCards({ stats }: DocumentStatsCardsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
        {statsConfig.map((config) => {
          const Icon = config.icon;
          const count = stats[config.key];

          return (
            <Link key={config.key} href={config.url} prefetch={false}>
              <Card className="transition-all hover:shadow-lg cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">
                    {config.title}
                  </CardTitle>
                  <div className={`p-2 rounded-full ${config.bgColor}`}>
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{count}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {count === 1 ? "document" : "documents"}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}

        {/* Total Summary Card */}
        <Card className="transition-all hover:shadow-lg cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">
              Total
            </CardTitle>
            <div className="p-2 rounded-full bg-blue-50">
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total documents
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
