export interface SkillEntity {
  id: string;
  name: string;
  slug: string;
  description: string;
  filePath: string;
  version: string;
  category: string;
  tags: string[];
  inputSchema: JsonSchema;
  outputSchema: JsonSchema;
  promptTemplate: string;
  preferredModel: string | null;
  isActive: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SkillDefinition {
  name: string;
  slug: string;
  version: string;
  category: string;
  description: string;
  author: string;
  tags: string[];
  preferredModel: string | null;
  isActive: boolean;
  filePath: string;
  inputSchema: JsonSchema;
  outputSchema: JsonSchema;
  promptTemplate: string;
  sections: {
    description: string;
    inputs: string;
    outputs: string;
    workflow: string;
    examples: string;
    prompt: string;
  };
}

export type JsonSchema = Record<string, unknown>;
