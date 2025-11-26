import { Suspense } from 'react';
import SearchPageClient from './search-client';

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="container mx-auto py-10"><div className="flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div><span className="ml-2">Loading search...</span></div></div>}>
      <SearchPageClient />
    </Suspense>
  );
}