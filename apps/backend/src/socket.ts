// Global socket instance for use in services
let ioInstance: any = null;

export const setSocketInstance = (io: any) => {
  ioInstance = io;
};

export const getSocketInstance = () => {
  return ioInstance;
};

// Function to emit notifications to a specific user
export const emitNotificationToUser = (userId: string, event: string, data: any) => {
  if (!ioInstance) {
    console.error('Socket.IO instance not initialized');
    return;
  }

  // Emit to the user's specific room
  ioInstance.to(`user-${userId}`).emit(event, data);

  // Also emit globally if needed for other components
  // ioInstance.emit(event, data);
};

// Function to emit notifications to a department
export const emitNotificationToDepartment = (departmentId: string, event: string, data: any) => {
  if (!ioInstance) {
    console.error('Socket.IO instance not initialized');
    return;
  }

  ioInstance.to(`department_${departmentId}`).emit(event, data);
};