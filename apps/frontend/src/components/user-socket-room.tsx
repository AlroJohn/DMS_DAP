'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useSocket } from '@/components/providers/providers';

export const UserSocketRoom = () => {
  const { user, isAuthenticated } = useAuth();
  const { socket } = useSocket();

  useEffect(() => {
    if (socket && isAuthenticated && user?.user_id) {
      // Join the user-specific room
      socket.emit('join-user-room', user.user_id);
      
      // Clean up on unmount or when user changes
      return () => {
        // Note: We can't directly leave the room, but we can avoid rejoining unnecessarily
      };
    }
  }, [socket, isAuthenticated, user]);

  return null; // This component doesn't render anything
};