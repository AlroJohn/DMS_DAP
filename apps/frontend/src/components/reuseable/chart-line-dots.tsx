"use client";

import { TrendingUp } from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export const description = "A line chart with dots";

// Define the chart data type
interface ChartData {
  month: string;
  active: number;
  archived: number;
}

interface ChartLineDotsProps {
  chartData: ChartData[];
}

const chartConfig = {
  active: {
    label: "Active",
    color: "var(--chart-1)",
  },
  archived: {
    label: "Archived",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function ChartLineDots({ chartData }: ChartLineDotsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Document Trends</CardTitle>
        <CardDescription>Last 6 Months Activity</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Line
              dataKey="active"
              type="natural"
              stroke="var(--color-active)"
              strokeWidth={2}
              dot={{
                fill: "var(--color-active)",
              }}
              activeDot={{
                r: 6,
              }}
            />
            <Line
              dataKey="archived"
              type="natural"
              stroke="var(--color-archived)"
              strokeWidth={2}
              dot={{
                fill: "var(--color-archived)",
              }}
              activeDot={{
                r: 6,
              }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          Document activity tracking <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-muted-foreground leading-none">
          Active vs Archived documents trend
        </div>
      </CardFooter>
    </Card>
  );
}
