"use client";

import React from 'react';
import ManagementCards from './ManagementCards';

const ManagementOverviewPage = () => {
  return (
    <div className="container mx-auto py-10">
      <h2 className="text-3xl font-bold tracking-tight mb-6">Management Overview</h2>
      <ManagementCards />
    </div>
  );
};

export default ManagementOverviewPage;
