'use client'

import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useEffect, useState } from 'react'

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose
} from '@/components/ui/dialog'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from '@/components/ui/form'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

interface Department {
    department_id: string;
    name: string;
    code: string;
    active: boolean;
}

const requestActions = [
    'For Approval',
    'For Signature', 
    'For Review',
    'For Information',
    'For Action',
    'For Comment',
    'For Endorsement',
    'For Filing',
    'For Release',
    'For Follow-up',
    'For Modification',
    'For Rejection',
]

const bulkTransmitSchema = z.object({
    departmentId: z.string().min(1, 'Please select a department.'),
    requestAction: z.string().min(1, 'Please select an action.'),
    remarks: z.string().optional(),
})

type BulkTransmitForm = z.infer<typeof bulkTransmitSchema>

interface BulkTransmitModalProps {
    documents: any[]
    isOpen: boolean
    onClose: () => void
}

export function BulkTransmitModal({ documents, isOpen, onClose }: BulkTransmitModalProps) {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loadingDepartments, setLoadingDepartments] = useState(false);

    const form = useForm<BulkTransmitForm>({
        resolver: zodResolver(bulkTransmitSchema),
        defaultValues: {
            departmentId: '',
            requestAction: '',
            remarks: '',
        },
    })

    useEffect(() => {
        if (isOpen) {
            fetchDepartments();
        }
    }, [isOpen]);

    const fetchDepartments = async () => {
        try {
            setLoadingDepartments(true);
            const response = await fetch('/api/admin/departments', {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    setDepartments(result.data || []);
                }
            }
        } catch (error) {
            console.error('Error fetching departments:', error);
        } finally {
            setLoadingDepartments(false);
        }
    };

    const { mutate: bulkTransmit, isPending } = useMutation({
        mutationFn: async (data: BulkTransmitForm) => {
            const promises = documents.map(doc => 
                fetch(`/api/documents/${doc.id}/release`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                })
            );

            const responses = await Promise.all(promises);
            const results = await Promise.all(responses.map(r => r.json()));
            
            const failed = results.filter((r, i) => !responses[i].ok);
            if (failed.length > 0) {
                throw new Error(`Failed to transmit ${failed.length} document(s)`);
            }

            return results;
        },
        onSuccess: () => {
            toast.success(`Successfully transmitted ${documents.length} document(s)!`)
            form.reset()
            onClose()
            setTimeout(() => window.location.reload(), 1000)
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to transmit documents.')
        }
    })

    const onSubmit = (data: BulkTransmitForm) => {
        bulkTransmit(data)
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle>Bulk Transmit Documents</DialogTitle>
                    <DialogDescription>
                        Transmit {documents.length} selected document(s) to another department.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <h4 className="font-medium mb-2">Selected Documents:</h4>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                        {documents.map((doc, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                                <Badge variant="outline">{doc.documentId}</Badge>
                                <span className="truncate">{doc.document}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="departmentId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Transmit To</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a department" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {loadingDepartments ? (
                                                <SelectItem value="loading" disabled>Loading departments...</SelectItem>
                                            ) : departments.length > 0 ? (
                                                departments.map(dep => (
                                                    <SelectItem key={dep.department_id} value={dep.department_id}>{dep.name}</SelectItem>
                                                ))
                                            ) : (
                                                <SelectItem value="no-departments" disabled>No departments available</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="requestAction"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Request Action</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select an action" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {requestActions.map(action => (
                                                <SelectItem key={action} value={action}>{action}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

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
                        
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="secondary">
                                    Cancel
                                </Button>
                            </DialogClose>
                            <Button type="submit" disabled={isPending}>
                                {isPending ? 'Transmitting...' : `Transmit ${documents.length} Document(s)`}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}