"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { domAnimation, LazyMotion, MotionConfig } from "motion/react";
import * as React from "react";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ApiError } from "@/lib/api/errors";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // Don't retry client errors (401/403/404/400); retry flaky network twice.
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.status >= 400 && error.status < 500) &&
          failureCount < 2,
      },
    },
  });
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <LazyMotion features={domAnimation} strict>
        <MotionConfig reducedMotion="user">
          <TooltipProvider delayDuration={200}>
            {children}
            <Toaster />
          </TooltipProvider>
        </MotionConfig>
      </LazyMotion>
    </QueryClientProvider>
  );
}
