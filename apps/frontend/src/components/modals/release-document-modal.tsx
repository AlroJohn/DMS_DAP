"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DocumentListItem as Document } from "@/hooks/use-documents";
import { useAuth } from "@/hooks/use-auth";
import { ScrollArea } from "../ui/scroll-area";

interface Department {
  department_id: string;
  name: string;
  code: string;
  active: boolean;
}

interface DocumentAction {
  document_action_id: string;
  action_name: string;
  description?: string;
  sender_tag?: string;
  recipient_tag?: string;
  status: boolean;
  action_date: string; // ISO string format
  created_at: string; // ISO string format
  updated_at: string; // ISO string format
  permission_id?: string;
}

const releaseDocumentSchema = z.object({
  departmentId: z.string().min(1, "Please select a department."),
  requestActions: z
    .array(z.string())
    .min(1, "Please select at least one action."),
  remarks: z.string().optional(),
});

type ReleaseDocumentForm = z.infer<typeof releaseDocumentSchema>;

interface ReleaseDocumentModalProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ReleaseDocumentModal({
  document,
  isOpen,
  onClose,
}: ReleaseDocumentModalProps) {
  const { user: currentUser } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [documentActions, setDocumentActions] = useState<DocumentAction[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingActions, setLoadingActions] = useState(false);

  const form = useForm<ReleaseDocumentForm>({
    resolver: zodResolver(releaseDocumentSchema),
    defaultValues: {
      departmentId: "",
      requestActions: [],
      remarks: "",
    },
  });

  // Fetch departments and document actions when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchDepartments();
      fetchDocumentActions();
    }
  }, [isOpen]);

  const fetchDepartments = async () => {
    try {
      setLoadingDepartments(true);
      const response = await fetch("/api/admin/departments", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Filter out the current user's department from the list of available departments
          const filteredDepartments =
            result.data?.filter(
              (dept: Department) =>
                dept.department_id !== currentUser?.department_id
            ) || [];
          setDepartments(filteredDepartments);
        }
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
    } finally {
      setLoadingDepartments(false);
    }
  };

  const fetchDocumentActions = async () => {
    try {
      setLoadingActions(true);
      const response = await fetch(
        "/api/admin/document-actions?activeOnly=true",
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setDocumentActions(result.data || []);
        }
      }
    } catch (error) {
      console.error("Error fetching document actions:", error);
    } finally {
      setLoadingActions(false);
    }
  };

  const { mutate: releaseDocument, isPending } = useMutation({
    mutationFn: async (data: ReleaseDocumentForm) => {
      console.log("🚀 Releasing document:", document!.id, "with data:", data);

      // Prepare the payload to send the array of action names
      const payload = {
        ...data,
        // Map the action names to action IDs if needed
        // For now, keeping the action names as selected by the user
      };

      const response = await fetch(`/api/documents/${document!.id}/release`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      console.log("📝 Release response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ Release error:", errorData);
        throw new Error(errorData.error || "Failed to release document.");
      }

      const result = await response.json();
      console.log("✅ Release success:", result);
      return result;
    },
    onSuccess: () => {
      toast.success("Document released successfully!");
      form.reset();
      onClose();
      setTimeout(() => window.location.reload(), 1000);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to release document.");
    },
  });

  const onSubmit = (data: ReleaseDocumentForm) => {
    // Validate that all selected actions are in the available document actions
    const allValidActions = data.requestActions.every((actionName) =>
      documentActions.some((action) => action.action_name === actionName)
    );

    if (!allValidActions && documentActions.length > 0) {
      toast.error("Please select valid actions only.");
      return;
    }

    releaseDocument(data);
  };

  if (!document) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="sticky top-0 z-10 p-6 pb-4">
          <DialogTitle>Release Document</DialogTitle>
          <DialogDescription>
            Release the document to another department for action.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 overflow-y-auto px-6">
          <div className="grid gap-4 h-full ">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="doc-code" className="text-right">
                Code
              </Label>
              <Input
                id="doc-code"
                value={document.documentId}
                readOnly
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="doc-name" className="text-right">
                Name
              </Label>
              <Input
                id="doc-name"
                value={document.document}
                readOnly
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="doc-classification" className="text-right">
                Classification
              </Label>
              <Input
                id="doc-classification"
                value={document.classification}
                readOnly
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="doc-owner" className="text-right">
                Owner
              </Label>
              <Input
                id="doc-owner"
                value={document.contactPerson}
                readOnly
                className="col-span-3"
              />
            </div>
          </div>

          <Form {...form}>
            <form
              id="release-document-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 pt-4"
            >
              <div className="w-full grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="departmentId"
                  render={({ field }) => (
                    <FormItem className="w-full grid grid-cols-4 items-center gap-4">
                      <FormLabel>Release To</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl className="w-full">
                          <SelectTrigger className="w-full col-span-3">
                            <SelectValue
                              placeholder={
                                currentUser?.department_id
                                  ? "Select a different department"
                                  : "Select a department"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-52">
                          {loadingDepartments ? (
                            <SelectItem value="loading" disabled>
                              Loading departments...
                            </SelectItem>
                          ) : departments.length > 0 ? (
                            departments.map((dep) => (
                              <SelectItem
                                key={dep.department_id}
                                value={dep.department_id}
                              >
                                {dep.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-departments" disabled>
                              {currentUser?.department_id
                                ? "No other departments available"
                                : "No departments available"}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="requestActions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Request Action(s)</FormLabel>
                      <div className="rounded-md border border-input p-4">
                        {loadingActions ? (
                          <div className="py-2 text-sm text-muted-foreground">
                            Loading actions...
                          </div>
                        ) : documentActions.length > 0 ? (
                          documentActions.map((action) => {
                            return (
                              <div
                                key={action.document_action_id}
                                className="flex items-center space-x-2 py-1"
                              >
                                <Checkbox
                                  id={`action-${action.document_action_id}`}
                                  checked={field.value?.includes(
                                    action.action_name
                                  )}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      field.onChange([
                                        ...(field.value || []),
                                        action.action_name,
                                      ]);
                                    } else {
                                      field.onChange(
                                        field.value?.filter(
                                          (value: string) =>
                                            value !== action.action_name
                                        )
                                      );
                                    }
                                  }}
                                />
                                <Label
                                  htmlFor={`action-${action.document_action_id}`}
                                  className="text-sm font-normal cursor-pointer"
                                >
                                  {action.action_name}
                                </Label>
                              </div>
                            );
                          })
                        ) : (
                          <div className="py-2 text-sm text-muted-foreground">
                            No actions available
                          </div>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="remarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remarks</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any remarks here..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </ScrollArea>
        <DialogFooter className="flex sm:justify-end p-6 pt-4">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="submit"
            disabled={isPending}
            form="release-document-form"
          >
            {isPending ? "Releasing..." : "Release"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
