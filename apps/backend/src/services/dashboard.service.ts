import { prisma } from '../lib/prisma';
import { DocumentService } from './document.service';

export class DashboardService {
    private documentService: DocumentService;

    constructor() {
        this.documentService = new DocumentService();
    }

    async getDashboardStats(userId: string) {
        const user = await prisma.user.findUnique({
            where: { user_id: userId },
            select: { department_id: true },
        });

        if (!user) {
            throw new Error('User not found');
        }

        const departmentId = user.department_id;
        if (!departmentId) {
            throw new Error('User does not have a department.');
        }

        const departmentDocumentIds = await this.getDepartmentDocumentIds(departmentId);

        // Use existing services to get counts
        const ownedDocuments = await this.documentService.getOwnedDocuments(userId, 1, 1);
        const receivedDocuments = await this.documentService.getReceivedDocuments(userId, 1, 1);
        const completedDocuments = await this.documentService.getCompletedDocuments(userId, 1, 1);

        const documentStats = {
            owned: ownedDocuments.pagination.total,
            inTransit: departmentDocumentIds.length > 0
                ? await prisma.document.count({
                    where: { status: 'intransit', document_id: { in: departmentDocumentIds } },
                })
                : 0,
            shared: receivedDocuments.pagination.total, // Assuming received are shared
            archive: departmentDocumentIds.length > 0
                ? await prisma.document.count({
                    where: { status: 'archive', document_id: { in: departmentDocumentIds } },
                })
                : 0,
            recycleBin: departmentDocumentIds.length > 0
                ? await prisma.document.count({
                    where: { status: 'deleted', document_id: { in: departmentDocumentIds } },
                })
                : 0,
            total: departmentDocumentIds.length > 0
                ? await prisma.document.count({
                    where: {
                        status: { notIn: ['deleted', 'archive'] },
                        document_id: { in: departmentDocumentIds },
                    },
                })
                : 0,
            completed: completedDocuments.pagination.total,
        };

        const documentTrends = await this.getDocumentTrends(departmentDocumentIds);
        const recentDocuments = await this.getRecentDocuments(userId);
        const recentActivity = await this.getRecentActivityCount(departmentDocumentIds);
        const pendingApprovals = await this.getPendingApprovalsCount(
            departmentId,
            departmentDocumentIds,
        );
        const activeWorkflows = await this.getActiveWorkflowsCount(departmentDocumentIds);
        const documentTypes = await this.getDocumentTypeDistribution(departmentDocumentIds);
        const departmentPerformance = await this.getDepartmentPerformance();
        const workflowStats = await this.getWorkflowStats(departmentDocumentIds);

        const stats = {
            documentStats: documentStats,
            recentActivity,
            pendingApprovals,
            activeWorkflows,
            collaborators: 10,
            storageUsage: { used: 50, total: 100, percentage: 50 },
            complianceStatus: 98,
            systemActivity: [],
            topDocuments: [],
            departmentPerformance,
            workflowStats,
            documentTypes,
            recentDocuments: recentDocuments,
            documentTrends: documentTrends,
        };

        return stats;
    }

    private parseWorkflowDepartments(workflow: unknown): string[] {
        if (!workflow) {
            return [];
        }

        try {
            if (Array.isArray(workflow)) {
                return workflow
                    .map((value) => (value == null ? '' : String(value)))
                    .filter((value) => value.length > 0);
            }

            if (typeof workflow === 'string') {
                const trimmed = workflow.trim();
                if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                    const parsed = JSON.parse(trimmed);
                    return this.parseWorkflowDepartments(parsed);
                }
                return trimmed ? [trimmed] : [];
            }

            if (typeof workflow === 'object' && workflow !== null) {
                return Object.values(workflow)
                    .map((value) => (value == null ? '' : String(value)))
                    .filter((value) => value.length > 0);
            }
        } catch (error) {
            console.error('Error parsing work_flow_id:', error);
        }

        return [];
    }

    private async getDepartmentDocumentIds(departmentId: string): Promise<string[]> {
        const details = await prisma.documentAdditionalDetails.findMany({
            select: {
                document_id: true,
                work_flow_id: true,
            },
        });

        const ids = details
            .filter((detail) => {
                const workflowDepartments = this.parseWorkflowDepartments(detail.work_flow_id);
                return workflowDepartments.includes(departmentId);
            })
            .map((detail) => detail.document_id);

        return [...new Set(ids)];
    }

    private async getDocumentTrends(documentIds: string[]) {
        if (documentIds.length === 0) {
            return [];
        }

        // Get documents from last 6 months
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const documents = await prisma.document.findMany({
            where: {
                created_at: { gte: sixMonthsAgo },
                document_id: { in: documentIds },
            },
            select: {
                created_at: true,
                status: true,
            },
        });

        // Group documents by month
        const monthlyData = new Map<string, { active: number; archived: number }>();
        
        documents.forEach(doc => {
            const month = new Date(doc.created_at).toLocaleString('default', { month: 'short' });
            const current = monthlyData.get(month) || { active: 0, archived: 0 };
            
            if (doc.status === 'archive') {
                current.archived++;
            } else {
                current.active++;
            }
            
            monthlyData.set(month, current);
        });

        // Convert to array and return
        return Array.from(monthlyData.entries()).map(([month, counts]) => ({
            month,
            active: counts.active,
            archived: counts.archived,
        }));
    }

    private async getRecentDocuments(userId: string) {
        const { data } = await this.documentService.getAllDocuments(userId, 1, 5);
        return data.map(doc => ({
            id: doc.id,
            title: doc.document,
            sender: {
                name: doc.contactPerson,
                initials: doc.contactPerson.substring(0, 2),
            },
            timeAgo: this.formatTimeAgo(doc.activityTime),
        }));
    }

    private async getRecentActivityCount(documentIds: string[]) {
        if (documentIds.length === 0) {
            return 0;
        }

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);

        // Execute queries sequentially to avoid connection exhaustion
        const createdCount = await prisma.document.count({
            where: {
                document_id: { in: documentIds },
                status: 'pending',
                created_at: { gte: startDate },
            },
        });

        const receivedCount = await prisma.document.count({
            where: {
                document_id: { in: documentIds },
                status: 'received',
                updated_at: { gte: startDate },
            },
        });

        return createdCount + receivedCount;
    }

    private async getPendingApprovalsCount(departmentId: string, documentIds: string[]) {
        if (documentIds.length === 0) {
            return 0;
        }

        const inTransitDocuments = await prisma.document.findMany({
            where: {
                status: 'intransit',
                document_id: { in: documentIds },
            },
            select: {
                document_id: true,
                document_trails: {
                    take: 1,
                    orderBy: { created_at: 'desc' },
                    select: { to_department: true },
                },
            },
        });

        return inTransitDocuments.filter((doc) => {
            const latestTrail = doc.document_trails[0];
            return latestTrail?.to_department === departmentId;
        }).length;
    }

    private async getActiveWorkflowsCount(documentIds: string[]) {
        if (documentIds.length === 0) {
            return 0;
        }

        return prisma.document.count({
            where: {
                status: { in: ['intransit', 'intransit_signature'] },
                document_id: { in: documentIds },
            },
        });
    }

    private formatTimeAgo(dateString: string): string {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        let interval = seconds / 31536000;
        if (interval > 1) {
            return Math.floor(interval) + " years ago";
        }
        interval = seconds / 2592000;
        if (interval > 1) {
            return Math.floor(interval) + " months ago";
        }
        interval = seconds / 86400;
        if (interval > 1) {
            return Math.floor(interval) + " days ago";
        }
        interval = seconds / 3600;
        if (interval > 1) {
            return Math.floor(interval) + " hours ago";
        }
        interval = seconds / 60;
        if (interval > 1) {
            return Math.floor(interval) + " minutes ago";
        }
        return Math.floor(seconds) + " seconds ago";
    }

    private async getDocumentTypeDistribution(documentIds: string[]) {
        if (documentIds.length === 0) {
            return [];
        }

        // Get all documents with their workflow
        const documents = await prisma.document.findMany({
            where: {
                status: { notIn: ['deleted'] },
                document_id: { in: documentIds },
            },
            select: {
                document_id: true,
                document_type: true,
            },
        });

        // Group by document type
        const typeCounts = documents.reduce((acc: any, doc) => {
            const type = doc.document_type || 'Other';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});

        return Object.entries(typeCounts).map(([type, count]) => ({
            type,
            count: count as number,
        }));
    }

    private async getDepartmentPerformance() {
        const departments = await prisma.department.findMany({
            where: { active: true },
            select: {
                department_id: true,
                name: true,
            },
        });

        // Execute department performance calculations sequentially to avoid connection exhaustion
        const performanceData = [];
        for (const dept of departments) {
            // Count all trails where this department sent or received documents
            const documentsProcessed = await prisma.documentTrail.count({
                where: {
                    OR: [
                        { from_department: dept.department_id },
                        { to_department: dept.department_id },
                    ],
                },
            });

            // Count completed documents where this department is in workflow
            const documents = await prisma.document.findMany({
                where: {
                    status: { notIn: ['deleted'] },
                },
                select: {
                    document_id: true,
                    status: true,
                    DocumentAdditionalDetails: {
                        select: {
                            work_flow_id: true,
                        },
                    },
                },
            });

            let documentsInWorkflow = 0;
            let completedInWorkflow = 0;

            documents.forEach((doc) => {
                const detail = doc.DocumentAdditionalDetails[0];
                if (!detail?.work_flow_id) return;

                try {
                    let workflowDepartments: string[] = [];
                    const workflow = detail.work_flow_id;

                    if (typeof workflow === 'object' && workflow !== null) {
                        workflowDepartments = Object.values(workflow)
                            .map((val: any) => String(val || ''))
                            .filter(Boolean);
                    }

                    if (workflowDepartments.includes(dept.department_id)) {
                        documentsInWorkflow++;
                        if (doc.status === 'completed') {
                            completedInWorkflow++;
                        }
                    }
                } catch (e) {
                    // Skip on error
                }
            });

            const efficiency = documentsInWorkflow > 0
                ? Math.round((completedInWorkflow / documentsInWorkflow) * 100)
                : 0;

            performanceData.push({
                name: dept.name,
                documentsProcessed,
                efficiency,
            });
        }

        // Sort by documents processed and return top 5
        return performanceData
            .filter(d => d.documentsProcessed > 0)
            .sort((a, b) => b.documentsProcessed - a.documentsProcessed)
            .slice(0, 5);
    }

    private async getWorkflowStats(documentIds: string[]) {
        if (documentIds.length === 0) {
            return {
                totalWorkflows: 0,
                completedWorkflows: 0,
                pendingWorkflows: 0,
                inProgressWorkflows: 0,
            };
        }

        // Get all documents with their workflow and trails
        const documents = await prisma.document.findMany({
            where: {
                status: { notIn: ['deleted'] },
                document_id: { in: documentIds },
            },
            select: {
                document_id: true,
                status: true,
                document_trails: {
                    orderBy: { created_at: 'desc' },
                    take: 1,
                    select: {
                        status: true,
                        to_department: true,
                        from_department: true,
                    },
                },
            },
        });

        let completedWorkflows = 0;
        let pendingWorkflows = 0;
        let inProgressWorkflows = 0;

        documents.forEach((doc) => {
            const status = doc.status;

            if (status === 'completed') {
                completedWorkflows++;
            } else if (status === 'intransit' || status === 'intransit_signature') {
                inProgressWorkflows++;
            } else if (status === 'pending' || status === 'received') {
                pendingWorkflows++;
            } else {
                pendingWorkflows++;
            }
        });

        const totalWorkflows = documents.length;

        return {
            totalWorkflows,
            completedWorkflows,
            pendingWorkflows,
            inProgressWorkflows,
        };
    }

    /**
     * Get quick access summary for dashboard
     */
    async getQuickAccessSummary(userId: string) {
        try {
            const user = await prisma.user.findUnique({
                where: { user_id: userId },
                include: {
                    account: true,
                },
            });

            if (!user || !user.account) {
                throw new Error("User or account not found");
            }

            const departmentId = user.account.department_id;

            const accountId = user.account.account_id;

            // Count pending signatures
            const pendingSignaturesCount = await this.getPendingSignaturesCount(userId);

            // Count incoming documents
            const incomingDocumentsCount = await this.getIncomingDocumentsCount(
                userId,
                departmentId
            );

            // Count documents to release
            const documentsToReleaseCount = await this.getDocumentsToReleaseCount(userId);

            // Count recent activity (last 7 days)
            const recentActivityCount = await this.getUserRecentActivityCount(userId);

            // Get additional counts: Completed (User vs Dept), Shared to Dept, Shared to User
            const additionalCounts = await this.getAdditionalDocumentCounts(userId, departmentId || '', accountId);

            return {
                pendingSignatures: pendingSignaturesCount,
                incomingDocuments: incomingDocumentsCount,
                documentsToRelease: documentsToReleaseCount,
                recentActivity: recentActivityCount,
                completedSharedToDepartment: additionalCounts.completedSharedToDepartment,
                completedSharedToUser: additionalCounts.completedSharedToUser,
                sharedToDepartment: additionalCounts.sharedToDepartment,
                sharedToUser: additionalCounts.sharedToUser,
            };
        } catch (error) {
            console.error("Error fetching quick access summary:", error);
            throw new Error("Failed to fetch quick access summary");
        }
    }

    private async getAdditionalDocumentCounts(userId: string, departmentId: string, accountId: string) {
        try {
            const allDetails = await prisma.documentAdditionalDetails.findMany({
                select: {
                    document_id: true,
                    work_flow_id: true,
                    received_by_departments: true,
                    account_id: true,
                },
            });

            const deptDocIds = new Set<string>();
            const userDocIds = new Set<string>();

            for (const detail of allDetails) {
                // Skip if current user is the owner
                if (detail.account_id === accountId) {
                    continue;
                }

                // Check Department Workflow
                const workflowDepartments = this.parseWorkflowDepartments(detail.work_flow_id);
                if (workflowDepartments.includes(departmentId)) {
                    deptDocIds.add(detail.document_id);
                }

                // Check Shared to User
                const sharedUsers = this.parseSharedUsers(detail.received_by_departments);
                if (sharedUsers.includes(userId)) {
                    userDocIds.add(detail.document_id);
                }
            }

            // Also check for documents that have been routed to this department via trails
            const trailsToDept = await prisma.documentTrail.findMany({
                where: {
                    to_department: departmentId,
                },
                select: {
                    document_id: true,
                },
                distinct: ['document_id']
            });
            
            trailsToDept.forEach(t => deptDocIds.add(t.document_id));

            const allRelevantIds = new Set([...deptDocIds, ...userDocIds]);
            
            if (allRelevantIds.size === 0) {
                return { 
                    completedSharedToDepartment: 0, 
                    completedSharedToUser: 0, 
                    sharedToDepartment: 0, 
                    sharedToUser: 0 
                };
            }

            const docStatuses = await prisma.document.findMany({
                where: {
                    document_id: { in: Array.from(allRelevantIds) },
                    status: { not: 'deleted' } 
                },
                select: {
                    document_id: true,
                    status: true
                }
            });

            const sharedToDepartment = docStatuses.filter(d => deptDocIds.has(d.document_id)).length;
            const sharedToUser = docStatuses.filter(d => userDocIds.has(d.document_id)).length;
            
            const completedSharedToDepartment = docStatuses.filter(d => 
                d.status === 'completed' && deptDocIds.has(d.document_id)
            ).length;

            const completedSharedToUser = docStatuses.filter(d => 
                d.status === 'completed' && userDocIds.has(d.document_id)
            ).length;

            return { 
                completedSharedToDepartment, 
                completedSharedToUser, 
                sharedToDepartment, 
                sharedToUser 
            };

        } catch (error) {
            console.error("Error getting additional counts:", error);
            return { 
                completedSharedToDepartment: 0, 
                completedSharedToUser: 0, 
                sharedToDepartment: 0, 
                sharedToUser: 0 
            };
        }
    }

    private parseSharedUsers(value: unknown): string[] {
        if (!value) return [];
        try {
            if (Array.isArray(value)) {
                return value.map(v => String(v));
            }
            if (typeof value === 'string') {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed)) return parsed.map(v => String(v));
            }
            if (typeof value === 'object') {
                 // In case it's some other object structure, but typically it should be array-like
                 return Object.values(value as object).map(v => String(v));
            }
        } catch (e) {
            // ignore parse errors
        }
        return [];
    }

    /**
     * Get count of documents with pending signatures for a user
     */
    private async getPendingSignaturesCount(userId: string): Promise<number> {
        try {
            const user = await prisma.user.findUnique({
                where: { user_id: userId },
                select: { department_id: true }
            });

            if (!user) {
                return 0;
            }

            // Find signature placeholders assigned to this user
            const placeholders = await prisma.signaturePlaceholder.findMany({
                where: {
                    OR: [
                        { assigned_user_id: userId },
                        { assigned_user_id: null, department_id: user.department_id },
                        { assigned_user_id: null, department_id: null },
                    ],
                },
                select: {
                    document_id: true,
                },
                distinct: ["document_id"],
            });

            const documentIds = [...new Set(placeholders.map((p) => p.document_id))];
            let documentsWithPendingSignatures = 0;

            for (const documentId of documentIds) {
                const userPlaceholders = await prisma.signaturePlaceholder.findMany({
                    where: {
                        document_id: documentId,
                        OR: [
                            { assigned_user_id: userId },
                            { assigned_user_id: null, department_id: user.department_id },
                            { assigned_user_id: null, department_id: null }
                        ],
                    },
                });

                const userSignatures = await prisma.signedDocument.findMany({
                    where: {
                        document_id: documentId,
                        signee_id: userId,
                    },
                });

                if (userPlaceholders.length > userSignatures.length) {
                    documentsWithPendingSignatures++;
                }
            }

            return documentsWithPendingSignatures;
        } catch (error) {
            console.error("Error counting pending signatures:", error);
            return 0;
        }
    }

    /**
     * Get count of incoming documents for user's department
     */
    private async getIncomingDocumentsCount(
        userId: string,
        departmentId: string | null
    ): Promise<number> {
        try {
            if (!departmentId) {
                return 0;
            }

            // Collect all incoming document IDs using the same logic as intransit.service.ts
            const incomingDocumentIds = new Set<string>();

            // Get documents released TO this department via DocumentTrail
            const releasedToThisDepartment = await prisma.documentTrail.findMany({
                where: {
                    to_department: departmentId,
                    status: 'intransit',
                    from_department: {
                        not: departmentId // Exclude documents from same department
                    },
                    OR: [
                        { assigned_to_user_id: null },
                        { assigned_to_user_id: userId }
                    ]
                },
                select: {
                    document_id: true,
                },
                orderBy: {
                    created_at: 'desc'
                }
            });

            // Add all documents that have been released to this department
            releasedToThisDepartment.forEach(trail => {
                incomingDocumentIds.add(trail.document_id);
            });

            // Also get documents assigned specifically to this user (from any department)
            const assignedToUserTrails = await prisma.documentTrail.findMany({
                where: {
                    assigned_to_user_id: userId,
                    status: 'intransit',
                },
                select: {
                    document_id: true,
                },
                orderBy: {
                    created_at: 'desc'
                }
            });

            assignedToUserTrails.forEach(trail => {
                incomingDocumentIds.add(trail.document_id);
            });

            // Remove documents that the user has already received IN THE CURRENT TRANSIT CYCLE
            const documentsToCheck = Array.from(incomingDocumentIds);
            for (const docId of documentsToCheck) {
                const latestIntransitTrail = await prisma.documentTrail.findFirst({
                    where: {
                        document_id: docId,
                        to_department: departmentId,
                        status: 'intransit'
                    },
                    orderBy: {
                        created_at: 'desc'
                    },
                    select: {
                        created_at: true
                    }
                });

                if (!latestIntransitTrail) {
                    // Check if it was assigned directly to user
                    const latestUserAssignedTrail = await prisma.documentTrail.findFirst({
                        where: {
                            document_id: docId,
                            assigned_to_user_id: userId,
                            status: 'intransit'
                        },
                        orderBy: {
                            created_at: 'desc'
                        },
                        select: {
                            created_at: true
                        }
                    });

                    if (!latestUserAssignedTrail) {
                        incomingDocumentIds.delete(docId);
                        continue;
                    }

                    // Check if user already received after user assignment
                    const receivedAfterUserAssigned = await prisma.documentTrail.findFirst({
                        where: {
                            document_id: docId,
                            status: 'received',
                            user_id: userId,
                            created_at: {
                                gte: latestUserAssignedTrail.created_at
                            }
                        },
                        select: { trail_id: true }
                    });

                    if (receivedAfterUserAssigned) {
                        incomingDocumentIds.delete(docId);
                    }
                    continue;
                }

                const receivedAfterIntransit = await prisma.documentTrail.findFirst({
                    where: {
                        document_id: docId,
                        status: 'received',
                        user_id: userId,
                        to_department: departmentId,
                        created_at: {
                            gte: latestIntransitTrail.created_at
                        }
                    },
                    select: { trail_id: true }
                });

                if (receivedAfterIntransit) {
                    incomingDocumentIds.delete(docId);
                }
            }

            return incomingDocumentIds.size;
        } catch (error) {
            console.error("Error counting incoming documents:", error);
            return 0;
        }
    }

    /**
     * Get count of documents that user can release/forward
     */
    private async getDocumentsToReleaseCount(userId: string): Promise<number> {
        try {
            const user = await prisma.user.findUnique({
                where: { user_id: userId },
                select: { account: { select: { department_id: true } } }
            });

            if (!user || !user.account) {
                return 0;
            }

            const count = await prisma.document.count({
                where: {
                    document_trails: {
                        some: {
                            to_department: user.account.department_id,
                            status: "received"
                        }
                    },
                    status: {
                        in: ["received", "pending"],
                    },
                },
            });

            return count;
        } catch (error) {
            console.error("Error counting documents to release:", error);
            return 0;
        }
    }

    /**
     * Get count of recent activity for a user (last 7 days)
     */
    private async getUserRecentActivityCount(userId: string): Promise<number> {
        try {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const count = await prisma.documentTrail.count({
                where: {
                    user_id: userId,
                    created_at: {
                        gte: sevenDaysAgo,
                    },
                },
            });

            return count;
        } catch (error) {
            console.error("Error counting recent activity:", error);
            return 0;
        }
    }
}
