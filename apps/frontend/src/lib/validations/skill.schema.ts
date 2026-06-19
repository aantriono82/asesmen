import { z } from "zod";

export const skillExecutionSchema = z.object({
  prompt: z.string().min(3, "Instruksi minimal 3 karakter").max(1000)
});

export type SkillExecutionValues = z.infer<typeof skillExecutionSchema>;
