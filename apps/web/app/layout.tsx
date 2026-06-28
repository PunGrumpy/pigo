import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { DesignSystemProvider } from "@/components/providers/client";
import { fonts } from "@/lib/fonts";

const title = "Pigo";
const description =
  "A minimal-dependency, minimal-configuration image optimizer written in Go.";

export const metadata: Metadata = { description, title };

interface RootLayoutProps {
  readonly children: ReactNode;
}

const RootLayout = ({ children }: RootLayoutProps) => (
  <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
    <body className={fonts}>
      <DesignSystemProvider>{children}</DesignSystemProvider>
    </body>
  </html>
);

export default RootLayout;
