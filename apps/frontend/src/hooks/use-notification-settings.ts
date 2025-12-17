import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export interface NotificationPreferences {
  email: {
    document_signed: boolean;
    document_received: boolean;
    workflow_updates: boolean;
  };
  push: {
    document_signed: boolean;
    document_received: boolean;
    workflow_updates: boolean;
  };
  frequency: 'immediate' | 'daily' | 'weekly';
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  email: {
    document_signed: true,
    document_received: true,
    workflow_updates: false,
  },
  push: {
    document_signed: true,
    document_received: true,
    workflow_updates: true,
  },
  frequency: 'immediate',
};

export const useNotificationSettings = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load preferences from API
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/notifications/settings');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setPreferences(prev => ({
              ...prev,
              ...data.data,
            }));
          }
        }
      } catch (error) {
        console.error('Error loading notification preferences:', error);
        toast.error('Failed to load notification preferences');
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, []);

  // Save preferences to API
  const savePreferences = async (newPreferences: NotificationPreferences) => {
    try {
      setSaving(true);
      
      const response = await fetch('/api/notifications/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(newPreferences),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save notification preferences');
      }

      const result = await response.json();
      if (result.success) {
        setPreferences(newPreferences);
        toast.success('Notification preferences saved successfully');
      } else {
        throw new Error(result.message || 'Failed to save notification preferences');
      }
    } catch (error: any) {
      console.error('Error saving notification preferences:', error);
      toast.error(error.message || 'Failed to save notification preferences');
    } finally {
      setSaving(false);
    }
  };

  // Toggle a specific notification setting
  const toggleSetting = (
    channel: keyof NotificationPreferences,
    setting: string,
    value?: boolean
  ) => {
    if (channel === 'frequency') {
      if (typeof value === 'string' && ['immediate', 'daily', 'weekly'].includes(value)) {
        const newPreferences = {
          ...preferences,
          frequency: value as 'immediate' | 'daily' | 'weekly',
        };
        setPreferences(newPreferences);
        savePreferences(newPreferences);
      }
      return;
    }

    const newPreferences = {
      ...preferences,
      [channel]: {
        ...preferences[channel as 'email' | 'push'],
        [setting]: value !== undefined ? value : !preferences[channel as 'email' | 'push'][setting as keyof (typeof preferences)['email' | 'push']],
      }
    };
    
    setPreferences(newPreferences);
    savePreferences(newPreferences);
  };

  return {
    preferences,
    loading,
    saving,
    savePreferences,
    toggleSetting,
  };
};