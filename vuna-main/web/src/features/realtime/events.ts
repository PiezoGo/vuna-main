import { z } from "zod";

const personSchema = z.object({ uid: z.string(), full_name: z.string(), role: z.string() });

/** A call as live events describe it (Module 11). */
export const callInfoSchema = z.object({
  id: z.string(),
  kind: z.enum(["audio", "video"]),
  status: z.string(),
  caller: personSchema,
  callee: personSchema,
  order: z.number().nullable(),
  order_title: z.string().nullable(),
});

export type CallInfo = z.infer<typeof callInfoSchema>;

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
  z.object({
    type: z.literal("call"),
    event: z.enum(["incoming", "accepted", "declined", "missed", "ended"]),
    call: callInfoSchema,
  }),
]);

export type LiveEvent = z.infer<typeof liveEventSchema>;

/** Wait before reconnect attempt n (0-based): 1 s, 2 s, 5 s, then every 30 s. */
export function reconnectDelay(attempt: number): number {
  return [1_000, 2_000, 5_000][attempt] ?? 30_000;
}
