import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const buttonGroupVariants = cva(
  "flex w-fit items-stretch has-[>[data-slot=button-group]]:gap-2 [&>*]:focus-visible:relative [&>*]:focus-visible:z-10",
  {
    defaultVariants: {
      orientation: "horizontal",
    },
    variants: {
      orientation: {
        horizontal:
          "[&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:border-l-0 [&>*:not(:last-child)]:rounded-r-none",
        vertical:
          "flex-col [&>*:not(:first-child)]:rounded-t-none [&>*:not(:first-child)]:border-t-0 [&>*:not(:last-child)]:rounded-b-none",
      },
    },
  }
);

const ButtonGroup = ({
  className,
  orientation,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof buttonGroupVariants>) => (
  <div
    role="group"
    data-slot="button-group"
    data-orientation={orientation}
    className={cn(buttonGroupVariants({ orientation }), className)}
    {...props}
  />
);

const ButtonGroupText = ({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & {
  asChild?: boolean;
}) => {
  const Comp = asChild ? Slot.Root : "div";

  return (
    <Comp
      className={cn(
        "flex items-center gap-2 rounded-md border bg-gray-100 px-4 font-medium text-sm shadow-xs [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-non",
        className
      )}
      {...props}
    />
  );
};

const ButtonGroupSeparator = ({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof Separator>) => (
  <Separator
    data-slot="button-group-separator"
    orientation={orientation}
    className={cn(
      "m-0! relative self-stretch bg-gray-alpha-400 data-[orientation=vertical]:h-auto",
      className
    )}
    {...props}
  />
);

export {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
  buttonGroupVariants,
};
