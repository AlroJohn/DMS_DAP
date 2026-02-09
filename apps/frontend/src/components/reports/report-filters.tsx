"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarIcon, Filter, X } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";

export interface DateRangeFilter {
  from: Date | undefined;
  to: Date | undefined;
}

export interface ReportFilters {
  dateRange: DateRangeFilter;
  dateRangePreset: string;
  department: string;
  classification: string;
  documentType: string;
}

interface ReportFiltersProps {
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
  departments?: Array<{ id: string; name: string }>;
  documentTypes?: Array<{ id: string; name: string }>;
  showDepartmentFilter?: boolean;
  showClassificationFilter?: boolean;
  showDocumentTypeFilter?: boolean;
}

const DATE_PRESETS = [
  { label: "All Time", value: "all" },
  { label: "Today", value: "today", days: 0 },
  { label: "Last 7 Days", value: "7days", days: 7 },
  { label: "Last 10 Days", value: "10days", days: 10 },
  { label: "Last 20 Days", value: "20days", days: 20 },
  { label: "Last 30 Days", value: "30days", days: 30 },
  { label: "Last 60 Days", value: "60days", days: 60 },
  { label: "Last 75 Days", value: "75days", days: 75 },
  { label: "Last 90 Days", value: "90days", days: 90 },
  { label: "This Month", value: "thismonth" },
  { label: "This Year", value: "thisyear" },
  { label: "Custom Range", value: "custom" },
];

const CLASSIFICATIONS = [
  { label: "All Classifications", value: "all" },
  { label: "Simple", value: "simple" },
  { label: "Compound", value: "compound" },
  { label: "Complex", value: "complex" },
];

export function ReportFilters({
  filters,
  onFiltersChange,
  departments = [],
  documentTypes = [],
  showDepartmentFilter = true,
  showClassificationFilter = true,
  showDocumentTypeFilter = true,
}: ReportFiltersProps) {
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  const handleDatePresetChange = (preset: string) => {
    const today = new Date();
    let from: Date | undefined;
    let to: Date | undefined = endOfDay(today);

    if (preset === "all") {
      from = undefined;
      to = undefined;
    } else if (preset === "today") {
      from = startOfDay(today);
      to = endOfDay(today);
    } else if (preset === "thismonth") {
      from = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (preset === "thisyear") {
      from = new Date(today.getFullYear(), 0, 1);
    } else if (preset === "custom") {
      setShowCustomDatePicker(true);
      return;
    } else {
      // Days-based presets
      const presetData = DATE_PRESETS.find((p) => p.value === preset);
      if (presetData?.days !== undefined) {
        from = startOfDay(subDays(today, presetData.days));
      }
    }

    onFiltersChange({
      ...filters,
      dateRangePreset: preset,
      dateRange: { from, to },
    });
    setShowCustomDatePicker(false);
  };

  const handleCustomDateChange = (range: DateRangeFilter) => {
    onFiltersChange({
      ...filters,
      dateRangePreset: "custom",
      dateRange: range,
    });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      dateRange: { from: undefined, to: undefined },
      dateRangePreset: "all",
      department: "all",
      classification: "all",
      documentType: "all",
    });
    setShowCustomDatePicker(false);
  };

  const hasActiveFilters =
    filters.dateRangePreset !== "all" ||
    filters.department !== "all" ||
    filters.classification !== "all" ||
    filters.documentType !== "all";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium shrink-0">Filters:</span>

        {/* Date Range Preset Selector */}
        <Select
          value={filters.dateRangePreset}
          onValueChange={handleDatePresetChange}
        >
          <SelectTrigger className="w-35">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            {DATE_PRESETS.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Custom Date Range Picker */}
        {showCustomDatePicker && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "w-60 justify-start text-left font-normal",
                  !filters.dateRange.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateRange.from ? (
                  filters.dateRange.to ? (
                    <>
                      {format(filters.dateRange.from, "MMM d, yyyy")} -{" "}
                      {format(filters.dateRange.to, "MMM d, yyyy")}
                    </>
                  ) : (
                    format(filters.dateRange.from, "MMM d, yyyy")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={filters.dateRange.from}
                selected={{
                  from: filters.dateRange.from,
                  to: filters.dateRange.to,
                }}
                onSelect={(range) =>
                  handleCustomDateChange({
                    from: range?.from,
                    to: range?.to,
                  })
                }
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        )}

        {/* Classification Filter */}
        {showClassificationFilter && (
          <Select
            value={filters.classification}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, classification: value })
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Classification" />
            </SelectTrigger>
            <SelectContent>
              {CLASSIFICATIONS.map((cls) => (
                <SelectItem key={cls.value} value={cls.value}>
                  {cls.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Document Type Filter */}
        {showDocumentTypeFilter && documentTypes.length > 0 && (
          <Select
            value={filters.documentType}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, documentType: value })
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Document Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {documentTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Department Filter */}
        {showDepartmentFilter && departments.length > 0 && (
          <Select
            value={filters.department}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, department: value })
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="h-9 px-2 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
          <span className="font-medium">Active:</span>
          {filters.dateRangePreset !== "all" && (
            <span className="bg-primary/10 text-primary px-2 py-1 rounded-md">
              {DATE_PRESETS.find((p) => p.value === filters.dateRangePreset)
                ?.label || "Custom Date Range"}
            </span>
          )}
          {filters.department !== "all" && (
            <span className="bg-primary/10 text-primary px-2 py-1 rounded-md">
              {departments.find((d) => d.id === filters.department)?.name ||
                filters.department}
            </span>
          )}
          {filters.classification !== "all" && (
            <span className="bg-primary/10 text-primary px-2 py-1 rounded-md">
              {CLASSIFICATIONS.find((c) => c.value === filters.classification)
                ?.label || filters.classification}
            </span>
          )}
          {filters.documentType !== "all" && (
            <span className="bg-primary/10 text-primary px-2 py-1 rounded-md">
              {documentTypes.find((t) => t.id === filters.documentType)?.name ||
                filters.documentType}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
