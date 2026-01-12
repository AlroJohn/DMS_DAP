import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth-middleware';

const prisma = new PrismaClient();

// Default notification preferences configuration
const DEFAULT_PREFERENCES = [
  {
    category: 'Documents',
    name: 'Document Upload',
    description: 'When a new document is uploaded to your department',
    email: true,
    inApp: true,
  },
  {
    category: 'Documents',
    name: 'Document Status Change',
    description: 'When a document status is updated',
    email: true,
    inApp: true,
  },
  {
    category: 'Documents',
    name: 'Document Shared',
    description: 'When a document is shared with you',
    email: true,
    inApp: true,
  },
  {
    category: 'Approvals',
    name: 'Approval Request',
    description: 'When a document requires your approval',
    email: true,
    inApp: true,
  },
  {
    category: 'Approvals',
    name: 'Approval Completed',
    description: 'When your approval request is processed',
    email: true,
    inApp: true,
  },
  {
    category: 'Blockchain',
    name: 'Document Signed',
    description: 'When a document is signed on blockchain',
    email: true,
    inApp: true,
  },
  {
    category: 'Blockchain',
    name: 'Signature Pending',
    description: 'When a document is awaiting your blockchain signature',
    email: true,
    inApp: true,
  },
  {
    category: 'Security',
    name: 'Login Alert',
    description: 'When someone logs into your account',
    email: true,
    inApp: true,
  },
  {
    category: 'Security',
    name: 'Permission Change',
    description: 'When your permissions are modified',
    email: true,
    inApp: true,
  },
  {
    category: 'System',
    name: 'System Maintenance',
    description: 'Scheduled maintenance and downtime notifications',
    email: true,
    inApp: true,
  },
  {
    category: 'System',
    name: 'System Updates',
    description: 'New features and system updates',
    email: false,
    inApp: true,
  },
  {
    category: 'Collaboration',
    name: 'Comments & Mentions',
    description: 'When someone comments or mentions you',
    email: true,
    inApp: true,
  },
];

export const getNotificationPreferences = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user || !authReq.user.id) {
      return res.status(401).json({ success: false, error: { message: 'User not authenticated' } });
    }
    const userId = authReq.user.id;

    // Get user's notification settings
    let settings = await prisma.notificationSettings.findUnique({
      where: { user_id: userId },
    });

    // Create default settings if they don't exist
    if (!settings) {
      settings = await prisma.notificationSettings.create({
        data: {
          user_id: userId,
          global_notifications: true,
          email_notifications: true,
        },
      });
    }

    // Get user's notification preferences
    const userPreferences = await prisma.notificationPreference.findMany({
      where: { user_id: userId },
    });

    // Create a map of existing preferences for quick lookup
    const preferencesMap = new Map(
      userPreferences.map(pref => [
        `${pref.category}-${pref.notification_name}`,
        pref
      ])
    );

    // Merge default preferences with user preferences
    const preferences = DEFAULT_PREFERENCES.map((defaultPref, index) => {
      const key = `${defaultPref.category}-${defaultPref.name}`;
      const userPref = preferencesMap.get(key);

      return {
        id: userPref?.preference_id || `default-${index}`,
        category: defaultPref.category,
        name: defaultPref.name,
        description: defaultPref.description,
        email: userPref?.email_enabled ?? defaultPref.email,
        inApp: userPref?.in_app_enabled ?? defaultPref.inApp,
      };
    });

    res.json({
      success: true,
      data: {
        settings: {
          globalNotifications: settings.global_notifications,
          emailNotifications: settings.email_notifications,
        },
        preferences,
      },
    });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch notification preferences' } });
  }
};

export const updateNotificationSettings = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user || !authReq.user.id) {
      return res.status(401).json({ success: false, error: { message: 'User not authenticated' } });
    }
    const userId = authReq.user.id;

    const { globalNotifications, emailNotifications } = req.body;

    const settings = await prisma.notificationSettings.upsert({
      where: { user_id: userId },
      update: {
        global_notifications: globalNotifications,
        email_notifications: emailNotifications,
      },
      create: {
        user_id: userId,
        global_notifications: globalNotifications,
        email_notifications: emailNotifications,
      },
    });

    res.json({
      success: true,
      data: {
        globalNotifications: settings.global_notifications,
        emailNotifications: settings.email_notifications,
      },
    });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to update notification settings' } });
  }
};

export const updateNotificationPreference = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user || !authReq.user.id) {
      return res.status(401).json({ success: false, error: { message: 'User not authenticated' } });
    }
    const userId = authReq.user.id;

    const { category, name, email, inApp } = req.body;

    if (!category || !name) {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'Category and name are required' } 
      });
    }

    const preference = await prisma.notificationPreference.upsert({
      where: {
        user_id_category_notification_name: {
          user_id: userId,
          category,
          notification_name: name,
        },
      },
      update: {
        email_enabled: email,
        in_app_enabled: inApp,
      },
      create: {
        user_id: userId,
        category,
        notification_name: name,
        email_enabled: email,
        in_app_enabled: inApp,
      },
    });

    res.json({
      success: true,
      data: {
        id: preference.preference_id,
        category: preference.category,
        name: preference.notification_name,
        email: preference.email_enabled,
        inApp: preference.in_app_enabled,
      },
    });
  } catch (error) {
    console.error('Error updating notification preference:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to update notification preference' } });
  }
};

export const updateBulkNotificationPreferences = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user || !authReq.user.id) {
      return res.status(401).json({ success: false, error: { message: 'User not authenticated' } });
    }
    const userId = authReq.user.id;

    const { preferences } = req.body;

    if (!Array.isArray(preferences)) {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'Preferences must be an array' } 
      });
    }

    // Update preferences in bulk
    const updates = await Promise.all(
      preferences.map(async (pref: any) => {
        return prisma.notificationPreference.upsert({
          where: {
            user_id_category_notification_name: {
              user_id: userId,
              category: pref.category,
              notification_name: pref.name,
            },
          },
          update: {
            email_enabled: pref.email,
            in_app_enabled: pref.inApp,
          },
          create: {
            user_id: userId,
            category: pref.category,
            notification_name: pref.name,
            email_enabled: pref.email,
            in_app_enabled: pref.inApp,
          },
        });
      })
    );

    res.json({
      success: true,
      data: {
        updated: updates.length,
      },
    });
  } catch (error) {
    console.error('Error updating bulk notification preferences:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to update notification preferences' } });
  }
};
