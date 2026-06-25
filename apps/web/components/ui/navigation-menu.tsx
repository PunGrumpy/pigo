import { cva } from "class-variance-authority";
import { ChevronDownIcon } from "lucide-react";
import { NavigationMenu as NavigationMenuPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

const NavigationMenuViewport = ({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Viewport>) => (
  <div className={cn("absolute top-[70%] left-0 flex justify-center")}>
    <NavigationMenuPrimitive.Viewport
      data-slot="navigation-menu-viewport"
      className={cn(
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-90 relative mt-3.5 h-[var(--radix-navigation-menu-viewport-height)] w-full origin-top-center overflow-hidden rounded-lg bg-background-100 text-gray-950 [box-shadow:var(--ds-shadow-menu)] data-[state=closed]:animate-out data-[state=open]:animate-in md:w-[var(--radix-navigation-menu-viewport-width)]",
        className
      )}
      {...props}
    />
  </div>
);

const NavigationMenu = ({
  className,
  children,
  viewport = true,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Root> & {
  viewport?: boolean;
}) => (
  <NavigationMenuPrimitive.Root
    data-slot="navigation-menu"
    data-viewport={viewport}
    className={cn(
      "group/navigation-menu relative z-10 flex max-w-max flex-1 items-center justify-center",
      className
    )}
    {...props}
  >
    {children}
    {viewport && <NavigationMenuViewport />}
  </NavigationMenuPrimitive.Root>
);

const NavigationMenuList = ({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.List>) => (
  <NavigationMenuPrimitive.List
    data-slot="navigation-menu-list"
    className={cn(
      "group flex flex-1 list-none items-center justify-center gap-1",
      className
    )}
    {...props}
  />
);

const NavigationMenuItem = ({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Item>) => (
  <NavigationMenuPrimitive.Item
    data-slot="navigation-menu-item"
    className={cn("relative", className)}
    {...props}
  />
);

const navigationMenuTriggerStyle = cva(
  "group relative inline-flex w-max items-center justify-center gap-1 px-3 text-gray-900 text-sm transition-colors hover:text-gray-1000 focus:text-gray-1000 focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:text-gray-1000 data-[state=open]:text-gray-1000"
);

const NavigationMenuTrigger = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Trigger>) => (
  <NavigationMenuPrimitive.Trigger
    data-slot="navigation-menu-trigger"
    className={cn(navigationMenuTriggerStyle(), "group", className)}
    {...props}
  >
    {children}{" "}
    <ChevronDownIcon
      className="ease relative top-px size-3.5 text-gray-900 transition-all duration-200 group-hover:text-gray-1000 group-data-[state=open]:rotate-180"
      aria-hidden="true"
    />
    <div className="absolute inset-x-0 bottom-0 z-50 -mx-12 hidden h-[18px] group-data-[state=open]:flex" />
  </NavigationMenuPrimitive.Trigger>
);

const NavigationMenuContent = ({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Content>) => (
  <NavigationMenuPrimitive.Content
    data-slot="navigation-menu-content"
    className={cn(
      "data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out top-0 left-0 w-full data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out md:absolute md:w-auto",
      "group-data-[viewport=false]/navigation-menu:data-[state=closed]:fade-out-0 group-data-[viewport=false]/navigation-menu:data-[state=open]:fade-in-0 group-data-[viewport=false]/navigation-menu:data-[state=closed]:zoom-out-95 group-data-[viewport=false]/navigation-menu:data-[state=open]:zoom-in-95 **:data-[slot=navigation-menu-link]:focus:outline-none **:data-[slot=navigation-menu-link]:focus:ring-0 group-data-[viewport=false]/navigation-menu:top-full group-data-[viewport=false]/navigation-menu:mt-1.5 group-data-[viewport=false]/navigation-menu:overflow-hidden group-data-[viewport=false]/navigation-menu:rounded-lg group-data-[viewport=false]/navigation-menu:bg-background-100 group-data-[viewport=false]/navigation-menu:text-gray-1000 group-data-[viewport=false]/navigation-menu:shadow group-data-[viewport=false]/navigation-menu:duration-200 group-data-[viewport=false]/navigation-menu:data-[state=closed]:animate-out group-data-[viewport=false]/navigation-menu:data-[state=open]:animate-in",
      className
    )}
    {...props}
  />
);

const NavigationMenuLink = ({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Link>) => (
  <NavigationMenuPrimitive.Link
    data-slot="navigation-menu-link"
    className={cn(
      "block w-full text-sm outline-none transition-colors",
      className
    )}
    {...props}
  />
);

const NavigationMenuIndicator = ({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Indicator>) => (
  <NavigationMenuPrimitive.Indicator
    data-slot="navigation-menu-indicator"
    className={cn(
      "data-[state=hidden]:fade-out data-[state=visible]:fade-in top-[70%] z-[1] flex items-end justify-center overflow-hidden transition-all duration-200 data-[state=hidden]:animate-out data-[state=visible]:animate-in",
      className
    )}
    {...props}
  >
    <div className="relative top-[6.5px] size-4 rotate-45 rounded-tl-sm border border-gray-200 border-r-0 border-b-0 bg-white" />
  </NavigationMenuPrimitive.Indicator>
);

export {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
  navigationMenuTriggerStyle,
};
