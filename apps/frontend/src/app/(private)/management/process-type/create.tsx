'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateProcessType() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration_days: '',
    is_active: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/process-type', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          duration_days: formData.duration_days ? parseInt(formData.duration_days) : null,
        }),
      });

      if (response.ok) {
        router.push('/management/process-type');
      }
    } catch (error) {
      console.error('Failed to create process type', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl mx-auto p-6">
      <div>
        <label className="block mb-2">Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div>
        <label className="block mb-2">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div>
        <label className="block mb-2">Duration (Days)</label>
        <input
          type="number"
          min="0"
          value={formData.duration_days}
          onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
          placeholder="e.g., 7, 14, 30"
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={formData.is_active}
          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
        />
        <label>Active</label>
      </div>

      <button
        type="submit"
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Create Process Type
      </button>
    </form>
  );
}