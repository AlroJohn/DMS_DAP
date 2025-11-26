'use client';

import { SharedDocument } from './columns';
import { useAuth } from '@/hooks/use-auth';

interface CheckoutStatusCellProps {
  document: SharedDocument;
}

export function CheckoutStatusCell({ document }: CheckoutStatusCellProps) {
  const { user } = useAuth();

  if (document.checkedOutBy) {
    const isCheckedOutByCurrentUser = user?.user_id === document.checkedOutBy.id;
    
    if (isCheckedOutByCurrentUser) {
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-xs text-green-600 font-medium">Checked out by you</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {document.checkedOutAt ? new Date(document.checkedOutAt).toLocaleDateString() : ''}
          </span>
        </div>
      );
    } else {
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-xs text-red-600 font-medium">Checked out</span>
          </div>
          <span className="text-xs text-muted-foreground">
            by {document.checkedOutBy.name}
          </span>
        </div>
      );
    }
  } else {
    return (
      <div className="flex items-center gap-1.5">
        <div className="h-2 w-2 rounded-full bg-green-500" />
        <span className="text-xs text-green-600 font-medium">Available</span>
      </div>
    );
  }
}