import { Suspense } from 'react';
import CreatePasswordClient from './create-password-client';

export default function CreatePasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-svh flex items-center justify-center p-6"><div className="w-full max-w-md text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div><p className="text-lg">Loading...</p></div></div>}>
      <CreatePasswordClient />
    </Suspense>
  );
}