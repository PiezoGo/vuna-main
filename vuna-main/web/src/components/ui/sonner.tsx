"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="top-center"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "!rounded-xl !border-border !shadow-lift !font-sans",
        },
      }}
      {...props}
    />
  );
}
