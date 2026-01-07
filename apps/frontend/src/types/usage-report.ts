export interface UsageReportData {
  statistics: {
    totalDocuments: number;
    activeUsers: number;
    storageUsed: string;
    apiCalls: number;
    documentsThisMonth: number;
    usersThisMonth: number;
    storageChange: string;
    apiCallChange: string;
  };
  departmentUsage: Array<{
    name: string;
    documents: number;
    users: number;
    storage: string;
    activity: number;
  }>;
  recentActivity: Array<{
    action: string;
    user: string;
    time: string;
  }>;
}