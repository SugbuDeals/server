import z from "zod";

// intent: chat
export const chatSchema = z.object({
  content: z.string()
});

// intent: product
export const recommendationSchema = z.object({
  // description
  content: z.string(),
  // recommendations
  recommendations: z.array(z.object({
    id: z.number()
  }))
});