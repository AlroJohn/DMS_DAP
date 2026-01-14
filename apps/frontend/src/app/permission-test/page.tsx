'use client';

import React from 'react';
import PermissionErrorTest from '@/components/permission-test/permission-error-test';

const PermissionTestPage = () => {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Permission Error Toast Testing</h1>
      <PermissionErrorTest />
    </div>
  );
};

export default PermissionTestPage;