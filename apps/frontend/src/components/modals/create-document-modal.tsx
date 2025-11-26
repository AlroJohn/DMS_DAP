"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

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

const docClassifications = ["simple", "complex", "highly_technical"] as const;
const docOrigins = ["internal", "external"] as const;
const docDeliveries = ["mail", "facsimile", "email", "personal"] as const;

const getDocumentTypes = async () => {
  const response = await fetch('/api/documents/types', {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Failed to fetch document types');
  }

  const result = await response.json();
  return result.success ? result.data : [];
};

const createDocumentSchema = z.object({
  document_name: z
    .string()
    .min(3, "Document name must be at least 3 characters."),
  classification: z.enum(docClassifications),
  type_id: z.string().min(1, "Please select a document type."),
  origin: z.enum(docOrigins),
  delivery: z.enum(docDeliveries),
});

type CreateDocumentForm = z.infer<typeof createDocumentSchema>;

interface CreateDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateDocumentModal({
  isOpen,
  onClose,
}: CreateDocumentModalProps) {
  const form = useForm<CreateDocumentForm>({
    resolver: zodResolver(createDocumentSchema),
    defaultValues: {
      document_name: "",
      classification: "simple",
      type_id: "",
      origin: "internal",
      delivery: "personal",
    },
  });

  const { data: documentTypes, isLoading: isLoadingTypes } = useQuery({
    queryKey: ["documentTypes"],
    queryFn: getDocumentTypes,
  });

  const { mutate: createDocument, isPending } = useMutation({
    mutationFn: async (data: CreateDocumentForm) => {
      const response = await fetch('/api/documents', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || "Failed to create document."
        );
      }

      const result = await response.json();
      return result.success ? result.data : result;
    },
    onSuccess: () => {
      toast.success("Document created successfully!");
      form.reset();
      onClose();
      // TODO: Invalidate documents query to refetch the list
    },
    onError: (error: Error) => {
      console.error("Error creating document:", error);
      toast.error(error.message || "Failed to create document.");
    },
  });

  const onSubmit = (data: CreateDocumentForm) => {
    createDocument(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Enroll New Document</DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new document.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="document_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Memo for budget approval"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="classification"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Classification</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a classification" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {docClassifications.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            isLoadingTypes ? "Loading..." : "Select a type"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {documentTypes?.map((type) => (
                        <SelectItem key={type.type_id} value={type.type_id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="origin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Origin</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an origin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {docOrigins.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="delivery"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delivery</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a delivery method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {docDeliveries.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating..." : "Create Document"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
