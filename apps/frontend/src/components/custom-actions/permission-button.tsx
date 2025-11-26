import * as React from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Permission } from "@dms/types";

import { useHasPermission } from "@/hooks/use-has-permission";
import { VariantProps } from "class-variance-authority";

interface PermissionButtonProps
  extends React.ComponentProps<typeof Button>,
    VariantProps<typeof buttonVariants> {
  permission: Permission;
  fallback?: React.ReactNode; // Optional: what to render if no permission
}

const PermissionButton = React.forwardRef<HTMLButtonElement, PermissionButtonProps>(
  ({ className, variant, size, permission, fallback, ...props }, ref) => {
    const hasPermission = useHasPermission(permission);

    if (!hasPermission) {
      return fallback ? <>{fallback}</> : null;
    }

    return (
      <Button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        variant={variant}
        size={size}
        {...props}
      />
    );
  }
);
PermissionButton.displayName = "PermissionButton";

export { PermissionButton };
