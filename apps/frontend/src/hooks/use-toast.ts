import { toast } from "sonner";

// Custom hook that provides the toast function with a consistent API
export const useToast = () => {
  // Wrapper function to match the expected API
  const showToast = ({
    title,
    description,
    variant = "default",
    ...props
  }: {
    title?: string;
    description?: string;
    variant?: "default" | "destructive";
    [key: string]: any;
  }) => {
    const message = title || description || "Notification";

    if (variant === "destructive") {
      return toast.error(message, {
        description,
        ...props
      });
    } else {
      // For default variant, use the generic toast function
      return toast(message, {
        description,
        ...props
      });
    }
  };

  return {
    toast: showToast,
  };
};