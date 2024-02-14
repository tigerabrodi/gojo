import { z } from "zod";

export const cardSchema = z.object({
  id: z.string(),
  text: z.string(),
  positionX: z.number(),
  positionY: z.number(),
});

export type CardType = z.infer<typeof cardSchema>;
