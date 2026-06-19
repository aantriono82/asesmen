import { z } from "zod";
import { DrizzleAssessmentRepository } from "@infra/repositories/drizzle-assessment.repository";

const addTagsSchema = z.object({
  entity_type: z.enum(["assessment", "curriculum", "question"]),
  entity_id: z.string().uuid(),
  tags: z.array(z.string().trim().min(1).max(60)).min(1).max(20)
});

export class SearchKnowledgeUseCase {
  public constructor(private readonly repository: DrizzleAssessmentRepository) {}

  public execute(input: { userId: string; q: string; type?: string; subject?: string }) {
    const types = input.type?.split(",").map((item) => item.trim()).filter(Boolean) ?? ["question", "assessment", "curriculum"];
    return this.repository.searchKnowledge({
      userId: input.userId,
      q: input.q,
      types,
      ...(input.subject ? { subject: input.subject } : {})
    });
  }
}

export class AddKnowledgeTagsUseCase {
  public constructor(private readonly repository: DrizzleAssessmentRepository) {}

  public async execute(input: { userId: string; payload: Record<string, unknown> }) {
    const payload = addTagsSchema.parse(input.payload);
    await this.repository.appendTags({
      entityType: payload.entity_type,
      entityId: payload.entity_id,
      userId: input.userId,
      tags: payload.tags
    });

    return { updated: true };
  }
}

export class ListKnowledgeTagsUseCase {
  public constructor(private readonly repository: DrizzleAssessmentRepository) {}

  public execute(userId: string) {
    return this.repository.listKnowledgeTags(userId);
  }
}
