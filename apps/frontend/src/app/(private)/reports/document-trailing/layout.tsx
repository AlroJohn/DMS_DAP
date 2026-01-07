import { PropsWithChildren } from "react";

export default function DocumentTrailingLayout({ children }: PropsWithChildren) {
  return (
    <div className="w-full max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {children}
    </div>
  );
}