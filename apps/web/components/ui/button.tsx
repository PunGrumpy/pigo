import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium text-sm outline-none transition-all focus-visible:border-gray-600 focus-visible:ring-[3px] focus-visible:ring-gray-600/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-red-800 aria-invalid:ring-red-800/20 dark:aria-invalid:ring-red-800/40 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        icon: "size-9",
        "icon-lg": "size-10",
        "icon-sm": "size-8",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
      },
      variant: {
        default: "bg-gray-1000 text-background-100 hover:bg-gray-1000/90",
        destructive:
          "bg-red-800 text-white hover:bg-red-800/90 focus-visible:ring-red-800/20 dark:bg-red-800/60 dark:focus-visible:ring-red-800/40",
        ghost:
          "hover:bg-gray-100 hover:text-gray-1000 dark:hover:bg-gray-100/50",
        link: "text-gray-1000 underline-offset-4 hover:underline",
        outline:
          "border bg-background-100 shadow-xs hover:bg-gray-100 hover:text-gray-1000 dark:border-gray-alpha-400 dark:bg-gray-alpha-400/30 dark:hover:bg-gray-alpha-400/50",
        secondary: "bg-gray-100 text-gray-1000 hover:bg-gray-100/80",
      },
    },
  }
);

const Button = ({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) => {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ className, size, variant }))}
      {...props}
    />
  );
};

export { Button, buttonVariants };
