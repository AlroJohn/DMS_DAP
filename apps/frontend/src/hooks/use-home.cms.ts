import { useState, useEffect } from "react";

export interface HomeCMSData {
  cms_id?: string;
  logo_url?: string;
  video_url?: string;
  vision?: string;
  mission?: string;
  welcome_title?: string;
  welcome_text?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export const useHomeCMS = () => {
  const [cmsData, setCmsData] = useState<HomeCMSData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Fetch CMS data
  const fetchCMS = async () => {
    try {
      setLoading(true);
      setError(null);

      // Add timestamp to prevent browser caching
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/home?t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });
      const result = await response.json();

      if (result.success) {
        setCmsData(result.data);
      } else {
        setError(result.message || "Failed to fetch CMS content");
      }
    } catch (err) {
      console.error("Error fetching CMS:", err);
      setError("Failed to load CMS content");
    } finally {
      setLoading(false);
    }
  };

  // Save CMS data
  const saveCMS = async (data: Omit<HomeCMSData, "cms_id" | "created_at" | "updated_at" | "is_active">) => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch("/api/home", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        setCmsData(result.data);
        return { success: true, data: result.data };
      } else {
        setError(result.message || "Failed to save CMS content");
        return { success: false, message: result.message };
      }
    } catch (err) {
      console.error("Error saving CMS:", err);
      const message = "Failed to save CMS content";
      setError(message);
      return { success: false, message };
    } finally {
      setSaving(false);
    }
  };

  // Load CMS data on mount
  useEffect(() => {
    fetchCMS();
  }, []);

  return {
    cmsData,
    loading,
    error,
    saving,
    fetchCMS,
    saveCMS,
  };
};
