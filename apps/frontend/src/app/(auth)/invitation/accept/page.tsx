import { Suspense } from 'react';
import AcceptInvitationClient from './accept-client';

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div><p className="text-lg">Loading invitation...</p></div></div>}>
      <AcceptInvitationClient />
    </Suspense>
  );
}