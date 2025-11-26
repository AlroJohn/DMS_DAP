"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { NotificationsProvider } from '@/context/notifications'
import { SessionTimeoutProvider } from "@/components/providers/session-timeout-provider";
import { UserSocketRoom } from '@/components/user-socket-room';

// Socket.IO Context
interface SocketContextType {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType>({ socket: null });

export const useSocket = () => {
  return useContext(SocketContext);
};

// Main Providers Component
export const Providers = ({ children }: { children: React.ReactNode }) => {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SessionTimeoutProvider
            timeout={20 * 60 * 1000}      // 20 minutes
            warningTime={2 * 60 * 1000}   // 2 minutes warning
            enabled={true}
          >
            <SocketProvider>
              <NotificationsProvider>{children}</NotificationsProvider>
            </SocketProvider>
          </SessionTimeoutProvider>
        </AuthProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
      <Toaster position="bottom-right" />
    </ThemeProvider>
  );
};

const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      const fetchSocketTokenAndConnect = async () => {
        try {
          const res = await fetch('/api/auth/socket-token', {
            credentials: 'include', // Include cookies for authentication
          });
          const data = await res.json();

          if (res.ok && data.success && data.token) {
            const socketUrl =
              process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";
            const newSocket = io(socketUrl, {
              auth: {
                token: data.token,
              },
              transports: ["websocket"],
              reconnection: true,
              reconnectionAttempts: Infinity,
              reconnectionDelay: 200,
              reconnectionDelayMax: 1000,
              timeout: 8000,
            });

            newSocket.on("connect", () => {
              console.log("Connected to socket server");
            });

            newSocket.on("disconnect", () => {
              console.log("Disconnected from socket server");
            });

            newSocket.on("incoming_document", (data) => {
              toast.info(`New document from ${data.fromDepartment}`, {
                description: `Action: ${data.action}`,
                action: {
                  label: "View",
                  onClick: () => {
                    // TODO: Navigate to the document or show a modal
                    console.log("Viewing document:", data.documentId);
                  },
                },
              });
            });

            setSocket(newSocket);

            return () => {
              console.log("Disconnecting socket...");
              newSocket.disconnect();
              setSocket(null);
            };
          } else {
            console.error('Failed to get socket token:', data.error);
          }
        } catch (error) {
          console.error('Error fetching socket token:', error);
        }
      };

      fetchSocketTokenAndConnect();
    }
  }, [isAuthenticated]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
      <UserSocketRoom />
    </SocketContext.Provider>
  );
};
