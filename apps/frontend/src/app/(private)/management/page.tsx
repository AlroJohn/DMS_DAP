"use client";

import React from 'react';
import { useManagementOverview } from '@/hooks/use-management-overview';
import ManagementCards from './ManagementCards';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { DateTime } from '@/components/wrapper/DateTime';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const ManagementOverviewPage = () => {
  const {
    departmentCount,
    documentTypeCount,
    documentActionCount,
    userCount,
    processTypeCount,
    departments,
    documentTypes,
    documentActions,
    users,
    processTypes,
    isLoading
  } = useManagementOverview();

  if (isLoading && (departments.length === 0 || documentTypes.length === 0 || documentActions.length === 0 || users.length === 0 || processTypes.length === 0)) {
    return (
      <div className="w-full flex h-full flex-col bg-background items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex flex-col gap-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Management Overview</h1>
        <p className="text-muted-foreground">
          Monitor and manage your organization's resources and system settings
        </p>
      </div>

      <ManagementCards />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 mb-8">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center">
              <span>Recent Departments</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : departments.length > 0 ? (
                departments.slice(0, 3).map((dept) => (
                  <div key={dept.department_id} className="flex justify-between items-center py-1">
                    <span className="text-sm font-medium truncate max-w-30">{dept.name}</span>
                    <Badge variant={dept.active ? "outline" : "secondary"} className="text-xs">
                      {dept.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">No departments found</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center">
              <span>Recent Document Types</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : documentTypes.length > 0 ? (
                documentTypes.slice(0, 3).map((type) => (
                  <div key={type.type_id} className="flex justify-between items-center py-1">
                    <span className="text-sm font-medium truncate max-w-30">{type.name}</span>
                    <Badge variant={type.active ? "outline" : "secondary"} className="text-xs">
                      {type.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">No document types found</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center">
              <span>Recent Document Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : documentActions.length > 0 ? (
                documentActions.slice(0, 3).map((action) => (
                  <div key={action.document_action_id} className="flex justify-between items-center py-1">
                    <span className="text-sm font-medium truncate max-w-30">{action.action_name}</span>
                    <Badge variant={action.status ? "outline" : "secondary"} className="text-xs">
                      {action.status ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">No document actions found</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center">
              <span>Recent Users</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : users.length > 0 ? (
                users.slice(0, 3).map((user) => (
                  <div key={user.user_id} className="flex justify-between items-center py-1">
                    <span className="text-sm font-medium truncate max-w-30">
                      {user.first_name} {user.last_name}
                    </span>
                    <Badge variant={user.active ? "outline" : "secondary"} className="text-xs">
                      {user.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">No users found</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center">
              <span>Recent Process Types</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : processTypes.length > 0 ? (
                processTypes.slice(0, 3).map((processType) => (
                  <div key={processType.process_type_id} className="flex justify-between items-center py-1">
                    <span className="text-sm font-medium truncate max-w-30">{processType.name}</span>
                    <Badge variant={processType.is_active ? "outline" : "secondary"} className="text-xs">
                      {processType.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">No process types found</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Department Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={departments.map(dept => ({
                      name: dept.name,
                      users: users.filter(u => u.department.department_id === dept.department_id).length
                    }))}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 50,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="users" name="Number of Users" fill="var(--primary)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Document Type Status</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Active Types', value: documentTypes.filter(dt => dt.active).length },
                        { name: 'Inactive Types', value: documentTypes.filter(dt => !dt.active).length }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                      nameKey="name"
                    >
                      <Cell key="active" fill="var(--primary)" />
                      <Cell key="inactive" fill="var(--secondary-hover)" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>User Status Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: 'Active Users', count: users.filter(u => u.active).length },
                      { name: 'Inactive Users', count: users.filter(u => !u.active).length },
                      { name: 'Active Accounts', count: users.filter(u => u.account.is_active).length },
                      { name: 'Inactive Accounts', count: users.filter(u => !u.account.is_active).length }
                    ]}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" name="Count" fill="var(--primary)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Document Action Status</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Active Actions', value: documentActions.filter(da => da.status).length },
                        { name: 'Inactive Actions', value: documentActions.filter(da => !da.status).length }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                      nameKey="name"
                    >
                      <Cell key="active" fill="var(--primary)" />
                      <Cell key="inactive" fill="var(--secondary-hover)" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Process Type Status</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Active Process Types', value: processTypes.filter(pt => pt.is_active).length },
                        { name: 'Inactive Process Types', value: processTypes.filter(pt => !pt.is_active).length }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                      nameKey="name"
                    >
                      <Cell key="active" fill="var(--primary)" />
                      <Cell key="inactive" fill="var(--secondary-hover)" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Process Types by Duration Unit</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: 'Days', count: processTypes.filter(pt => pt.duration_unit === 'days').length },
                      { name: 'Hours', count: processTypes.filter(pt => pt.duration_unit === 'hours').length },
                      { name: 'Minutes', count: processTypes.filter(pt => pt.duration_unit === 'minutes').length },
                      { name: 'Weeks', count: processTypes.filter(pt => pt.duration_unit === 'weeks').length }
                    ].filter(item => item.count > 0)}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" name="Count" fill="var(--primary)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManagementOverviewPage;
