"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { ErrorBoundary } from "@components/ui/ErrorBoundary";
import { Navbar } from "@components/ui/Navbar";
import { PageLoader } from "@components/ui/PageLoader";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <PageLoader />
      <Navbar />
      {children}
      <Toaster richColors position="top-right" />
    </ErrorBoundary>
  );
}
