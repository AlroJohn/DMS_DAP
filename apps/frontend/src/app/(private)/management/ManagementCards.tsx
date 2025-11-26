import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface CounterData {
  count: number;
}

const fetchCount = async (url: string): Promise<CounterData> => {
  const token = localStorage.getItem('accessToken') || document.cookie
    .split(';')
    .find(c => c.trim().startsWith('accessToken='))
    ?.split('=')[1];

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch count');
  }
  const data = await response.json();
  return data.data;
};

const ManagementCards: React.FC = () => {
  const { data: departmentCount, isLoading: isLoadingDepartments } = useQuery<CounterData>({ queryKey: ['departmentCount'], queryFn: () => fetchCount('/api/admin/counts/departments') });
  const { data: documentTypeCount, isLoading: isLoadingDocumentTypes } = useQuery<CounterData>({ queryKey: ['documentTypeCount'], queryFn: () => fetchCount('/api/admin/counts/document-types') });
  const { data: documentActionCount, isLoading: isLoadingDocumentActions } = useQuery<CounterData>({ queryKey: ['documentActionCount'], queryFn: () => fetchCount('/api/admin/counts/document-actions') });
  const { data: userCount, isLoading: isLoadingUsers } = useQuery<CounterData>({ queryKey: ['userCount'], queryFn: () => fetchCount('/api/admin/counts/users') });

  const cards = [
    {
      title: 'Departments',
      count: departmentCount?.count,
      isLoading: isLoadingDepartments,
      href: '/management/department',
    },
    {
      title: 'Document Types',
      count: documentTypeCount?.count,
      isLoading: isLoadingDocumentTypes,
      href: '/management/document-type',
    },
    {
      title: 'Document Actions',
      count: documentActionCount?.count,
      isLoading: isLoadingDocumentActions,
      href: '/management/document-action',
    },
    {
      title: 'Users',
      count: userCount?.count,
      isLoading: isLoadingUsers,
      href: '/management/user-management',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {card.title}
            </CardTitle>
            {/* Icon can be added here */}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {card.isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
              ) : (
                card.count ?? 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Total {card.title.toLowerCase()}
            </p>
            <Link href={card.href} passHref>
              <Button variant="link" className="px-0 mt-2">
                View All
              </Button>
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ManagementCards;
