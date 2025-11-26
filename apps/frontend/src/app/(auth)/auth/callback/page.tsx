import { Suspense } from 'react';
import AuthCallbackClient from './callback-client';

export default function AuthCallback() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div><p className="text-lg">Completing authentication...</p></div></div>}>
      <AuthCallbackClient />
    </Suspense>
  );
}