import { cn } from "@/lib/utils";

const Kbd = ({ className, ...props }: React.ComponentProps<"kbd">) => (
  <kbd
    data-slot="kbd"
    className={cn(
      "pointer-events-none inline-flex h-5 w-fit min-w-5 select-none items-center justify-center gap-1 rounded-sm bg-gray-100 px-1 font-medium font-sans text-gray-800 text-xs",
      "[&_svg:not([class*='size-'])]:size-3",
      "[[data-slot=tooltip-content]_&]:bg-background-100/20 [[data-slot=tooltip-content]_&]:text-background-100 dark:[[data-slot=tooltip-content]_&]:bg-background-100/10",
      className
    )}
    {...props}
  />
);

const KbdGroup = ({ className, ...props }: React.ComponentProps<"div">) => (
  <kbd
    data-slot="kbd-group"
    className={cn("inline-flex items-center gap-1", className)}
    {...props}
  />
);

export { Kbd, KbdGroup };
