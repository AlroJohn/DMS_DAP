"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Search, PlusCircle, Edit, Trash2, RotateCcw } from "lucide-react";
import { AlertModal } from "@/components/reuseable/alert-modal";
import { Badge } from "@/components/ui/badge";

export interface Column<T> {
  header: string;
  accessorKey: keyof T | ((row: T) => React.ReactNode);
  cell?: (row: T) => React.ReactNode;
}

interface DataTableProps<T extends { [key: string]: any }> {
  title: string;
  description: string;
  data: T[];
  columns: Column<T>[];
  searchTerm: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAddClick: () => void;
  onEdit: (item: T) => void;
  onToggleStatus: (id: string) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
  dialogOpen: boolean;
  onDialogOpenChange: (open: boolean) => void;
  dialogTitle: string;
  dialogDescription: string;
  dialogContent: React.ReactNode;
  formSubmit: (e: React.FormEvent) => void;
  formCancel: () => void;
  addEditButtonText: string;
  alertModalProps: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    loading: boolean;
    title: string;
    description: string;
  };
  idFieldName: keyof T;
  statusFieldName: keyof T;
  searchPlaceholder?: string;
  addButtonText?: string;
}

export function DataTable<T extends { [key: string]: any }>({
  title,
  description,
  data,
  columns,
  searchTerm,
  onSearchChange,
  onAddClick,
  onEdit,
  onToggleStatus,
  onDelete,
  isLoading,
  dialogOpen,
  onDialogOpenChange,
  dialogTitle,
  dialogDescription,
  dialogContent,
  formSubmit,
  formCancel,
  addEditButtonText,
  alertModalProps,
  idFieldName,
  statusFieldName,
  searchPlaceholder = "Search...",
  addButtonText = "Add New",
}: DataTableProps<T>) {
  return (
    <div className="container mx-auto py-10">
      <AlertModal {...alertModalProps} />
      <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={onSearchChange}
                className="pl-8 w-full sm:w-auto"
              />
            </div>
            <Dialog open={dialogOpen} onOpenChange={onDialogOpenChange}>
              <DialogTrigger asChild>
                <Button onClick={onAddClick}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  {addButtonText}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{dialogTitle}</DialogTitle>
                  <DialogDescription>{dialogDescription}</DialogDescription>
                </DialogHeader>
                <form onSubmit={formSubmit} className="space-y-4">
                  {dialogContent}
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={formCancel}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">{addEditButtonText}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((column, index) => (
                      <TableHead key={index}>{column.header}</TableHead>
                    ))}
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.length > 0 ? (
                    data.map((item) => (
                      <TableRow key={item[idFieldName]}>
                        {columns.map((column, index) => (
                          <TableCell key={index}>
                            {column.cell
                              ? column.cell(item)
                              : typeof column.accessorKey === "function"
                              ? column.accessorKey(item)
                              : item[column.accessorKey]}
                          </TableCell>
                        ))}
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onEdit(item)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onToggleStatus(item[idFieldName])}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onDelete(item[idFieldName])}
                              disabled={item[statusFieldName]}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length + 1}
                        className="text-center py-8 text-gray-500"
                      >
                        No data found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
