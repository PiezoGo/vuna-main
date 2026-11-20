"use client";

import { useEffect } from "react";

/** Last-resort error boundary for failures in the root layout. Must render its own <html>. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#faf8f5",
          color: "#1c1917",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: 28, marginBottom: 8 }}>VUNA is having trouble</h1>
          <p style={{ color: "#6b625a", marginBottom: 24 }}>
            Please refresh the page or try again in a moment.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#8b5a2b",
              color: "#fff",
              border: 0,
              borderRadius: 10,
              padding: "12px 20px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
