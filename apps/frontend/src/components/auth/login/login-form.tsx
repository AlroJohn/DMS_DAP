import { Suspense } from 'react';
import { LoginFormClient } from './login-form-client';

export function LoginForm(props: React.ComponentProps<"div">) {
  return (
    <Suspense fallback={<div className="flex flex-col gap-6"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div><p className="text-center">Loading...</p></div>}>
      <LoginFormClient {...props} />
    </Suspense>
  );
}