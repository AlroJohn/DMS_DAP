import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useManagementOverview } from '@/hooks/use-management-overview';

interface ManagementCardProps {
  title: string;
  count: number | undefined;
  isLoading: boolean;
  href: string;
}

const ManagementCard: React.FC<ManagementCardProps> = ({ title, count, isLoading, href }) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        {/* Icon can be added here */}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
          ) : (
            count ?? 0
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Total {title.toLowerCase()}
        </p>
        <Link href={href} passHref>
          <Button variant="link" className="px-0 mt-2">
            View All
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};

const ManagementCards: React.FC = () => {
  const {
    departmentCount,
    documentTypeCount,
    documentActionCount,
    userCount,
    isLoading: overviewIsLoading
  } = useManagementOverview();

  const cards = [
    {
      title: 'Departments',
      count: departmentCount?.count,
      isLoading: overviewIsLoading,
      href: '/management/department',
    },
    {
      title: 'Document Types',
      count: documentTypeCount?.count,
      isLoading: overviewIsLoading,
      href: '/management/document-type',
    },
    {
      title: 'Document Actions',
      count: documentActionCount?.count,
      isLoading: overviewIsLoading,
      href: '/management/document-action',
    },
    {
      title: 'Users',
      count: userCount?.count,
      isLoading: overviewIsLoading,
      href: '/management/user-management',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      {cards.map((card) => (
        <ManagementCard
          key={card.title}
          title={card.title}
          count={card.count}
          isLoading={card.isLoading}
          href={card.href}
        />
      ))}
    </div>
  );
};

export default ManagementCards;
