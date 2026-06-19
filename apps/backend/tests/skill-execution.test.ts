import { describe, expect, it, vi } from "vitest";
import { ExecuteSkillUseCase } from "../src/application/skills/skill-execution.use-case";
import { processSkillExecutionJob } from "../src/infrastructure/queue/workers/skill-execution.worker";

vi.mock("../src/infrastructure/skills/skill-loader", () => ({
  loadSkillBySlug: vi.fn()
}));

const { getActiveProviderMock, executeSkillWithAIMock } = vi.hoisted(() => ({
  getActiveProviderMock: vi.fn(),
  executeSkillWithAIMock: vi.fn()
}));

vi.mock("../src/infrastructure/ai/ai-provider.registry", () => ({
  AIProviderRegistry: vi.fn().mockImplementation(() => ({
    getActiveProvider: getActiveProviderMock
  }))
}));

vi.mock("../src/application/skills/skill-ai-runtime", () => ({
  executeSkillWithAI: executeSkillWithAIMock
}));

describe("skill execution", () => {
  it("validates input before queueing execution", async () => {
    const skills = {
      findActiveBySlug: vi.fn().mockResolvedValue({
        id: "skill-id",
        slug: "generate-soal-pilihan-ganda"
      })
    };
    const executions = {
      createPending: vi.fn().mockResolvedValue({
        id: "execution-id",
        userId: "user-id",
        skillId: "skill-id",
        skillSlug: "generate-soal-pilihan-ganda",
        input: { topic: "Fotosintesis" },
        output: null,
        status: "pending",
        durationMs: null,
        error: null,
        createdAt: new Date()
      })
    };
    const queue = {
      send: vi.fn().mockResolvedValue(undefined)
    };

    const { loadSkillBySlug } = await import("../src/infrastructure/skills/skill-loader");
    vi.mocked(loadSkillBySlug).mockResolvedValue({
      name: "Generate Soal Pilihan Ganda",
      slug: "generate-soal-pilihan-ganda",
      version: "1.0.0",
      category: "assessment",
      description: "Membuat soal",
      author: "ATIGA",
      tags: [],
      isActive: true,
      filePath: "/skills/generate-soal-pilihan-ganda/skill.md",
      inputSchema: {
        type: "object",
        required: ["topic"],
        properties: {
          topic: { type: "string" }
        }
      },
      outputSchema: {},
      promptTemplate: "",
      sections: {
        description: "",
        inputs: "",
        outputs: "",
        workflow: "",
        examples: "",
        prompt: ""
      }
    });

    const useCase = new ExecuteSkillUseCase(skills as never, executions as never, queue as never);
    const result = await useCase.execute({
      userId: "user-id",
      slug: "generate-soal-pilihan-ganda",
      input: { topic: "Fotosintesis" }
    });

    expect(result.status).toBe("pending");
    expect(queue.send).toHaveBeenCalledWith("skill-execution", { executionId: "execution-id" });
  });

  it("moves a job from running to completed", async () => {
    getActiveProviderMock.mockResolvedValue({
      name: "deepseek",
      model: "deepseek-chat",
      isAvailable: vi.fn().mockResolvedValue(true)
    });
    executeSkillWithAIMock.mockResolvedValue({
      prompt: "mock prompt",
      completion: {
        text: JSON.stringify({
          questions: [
            {
              question: "Media semai yang sering dipakai pada hidroponik NFT adalah ...",
              options: {
                A: "Tanah",
                B: "Rockwool",
                C: "Pasir",
                D: "Sekam"
              },
              correct_answer: "B",
              explanation: "Rockwool umum dipakai sebagai media semai."
            }
          ]
        }),
        finishReason: "stop",
        usage: { inputTokens: 1, outputTokens: 1 },
        toolCalls: []
      },
      output: {
        questions: [
          {
            question: "Media semai yang sering dipakai pada hidroponik NFT adalah ...",
            options: {
              A: "Tanah",
              B: "Rockwool",
              C: "Pasir",
              D: "Sekam"
            },
            correct_answer: "B",
            explanation: "Rockwool umum dipakai sebagai media semai."
          }
        ]
      }
    });

    const updateStatus = vi.fn();
    const executionStore = {
      findById: vi.fn().mockResolvedValue({
        id: "execution-id",
        userId: "user-id",
        skillId: "skill-id",
        skillSlug: "generate-soal-pilihan-ganda",
        input: { topic: "Fotosintesis" },
        output: null,
        status: "pending",
        durationMs: null,
        error: null,
        createdAt: new Date()
      }),
      updateStatus
    };

    const skillRepository = {
      findActiveBySlug: vi.fn().mockResolvedValue({ id: "skill-id", slug: "generate-soal-pilihan-ganda" })
    };

    const { loadSkillBySlug } = await import("../src/infrastructure/skills/skill-loader");
    vi.mocked(loadSkillBySlug).mockResolvedValue({
      name: "Generate Soal Pilihan Ganda",
      slug: "generate-soal-pilihan-ganda",
      version: "1.0.0",
      category: "assessment",
      description: "Membuat soal",
      author: "ATIGA",
      tags: [],
      isActive: true,
      filePath: "/skills/generate-soal-pilihan-ganda/skill.md",
      inputSchema: {
        type: "object",
        required: ["topic"],
        properties: {
          topic: { type: "string" }
        }
      },
      outputSchema: {},
      promptTemplate: "",
      sections: {
        description: "",
        inputs: "",
        outputs: "",
        workflow: "",
        examples: "",
        prompt: ""
      }
    });

    await processSkillExecutionJob("execution-id", executionStore as never, skillRepository as never);

    expect(updateStatus).toHaveBeenCalledWith("execution-id", { status: "running" });
    expect(getActiveProviderMock).toHaveBeenCalledTimes(1);
    expect(executeSkillWithAIMock).toHaveBeenCalledTimes(1);
    expect(updateStatus).toHaveBeenCalledWith(
      "execution-id",
      expect.objectContaining({
        status: "completed"
      })
    );
  });
});
