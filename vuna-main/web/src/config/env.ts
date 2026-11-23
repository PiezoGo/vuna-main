import { z } from "zod";

/**
 * The single source of environment variables. Import `env`/`publicEnv` from here,
 * never read process.env elsewhere. Build and boot fail fast with a clear message
 * when something required is missing.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().default(""),
});

const serverSchema = z.object({
  /** Django API base, including the trailing /api (e.g. https://vuna-main.onrender.com/api). */
  API_URL: z.url(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

function parse<T extends z.ZodType>(
  schema: T,
  values: Record<string, unknown>,
  label: string,
): z.infer<T> {
  const result = schema.safeParse(values);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    // Names only (never values), so a failing deploy log shows what the host actually provided.
    const seen = Object.keys(process.env)
      .filter(
        (k) =>
          k === "API_URL" || k.startsWith("NEXT_PUBLIC_") || k === "ENABLE_EXPERIMENTAL_COREPACK",
      )
      .sort();
    const host = process.env.VERCEL
      ? ` Vercel environment: ${process.env.VERCEL_ENV ?? "unknown"}.`
      : "";
    throw new Error(
      `Invalid ${label} environment variables:\n${issues}\n` +
        `Variables present: ${seen.length ? seen.join(", ") : "none of API_URL / NEXT_PUBLIC_*"}.${host}\n` +
        "See web/.env.example (on Vercel: Settings → Environment Variables, tick the environment named above).",
    );
  }
  return result.data;
}

// NEXT_PUBLIC_* must be referenced literally so Next.js can inline them in the browser bundle.
export const publicEnv = parse(
  publicSchema,
  {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  },
  "public",
);

type ServerEnv = z.infer<typeof serverSchema>;
let cachedServerEnv: ServerEnv | undefined;

/** Server-only variables. Throws if called in the browser. */
export function serverEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv() was called in the browser.");
  }
  cachedServerEnv ??= parse(
    serverSchema,
    { API_URL: process.env.API_URL, NODE_ENV: process.env.NODE_ENV },
    "server",
  );
  return cachedServerEnv;
}
