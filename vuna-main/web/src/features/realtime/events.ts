import { z } from "zod";

/** Events the backend sends on the live connection (validated at the boundary). */
export const liveEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("hello") }),
  z.object({ type: z.literal("pong") }),
  z.object({ type: z.literal("badges") }),
  z.object({
    type: z.literal("notification"),
    notification: z.object({
      id: z.number(),
      title: z.string(),
      body: z.string(),
      link: z.string(),
    }),
  }),
  z.object({
    type: z.literal("message"),
    partner: z.string(),
    message: z.object({ id: z.number(), sender: z.string(), order: z.number().nullable() }),
  }),
  z.object({ type: z.literal("read"), partner: z.string() }),
]);

export type LiveEvent = z.infer<typeof liveEventSchema>;

/** Wait before reconnect attempt n (0-based): 1 s, 2 s, 5 s, then every 30 s. */
export function reconnectDelay(attempt: number): number {
  return [1_000, 2_000, 5_000][attempt] ?? 30_000;
}
