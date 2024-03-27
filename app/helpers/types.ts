import { z } from 'zod'

export const cardSchema = z.object({
  id: z.string(),
  html: z.string(),
  positionX: z.number(),
  positionY: z.number(),
  width: z.number(),
  height: z.number(),
})

export type CardType = z.infer<typeof cardSchema>
