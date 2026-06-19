import { describe, expect, it, vi } from "vitest";

const listSkillsExecuteMock = vi.fn();
const getSkillExecuteMock = vi.fn();
const discoveryExecuteMock = vi.fn();

vi.mock("../src/application/use-cases/skill-use-cases", () => ({
  ListSkillsUseCase: vi.fn().mockImplementation(() => ({
    execute: listSkillsExecuteMock
  })),
  GetSkillBySlugUseCase: vi.fn().mockImplementation(() => ({
    execute: getSkillExecuteMock
  }))
}));

vi.mock("../src/application/skills/skill-discovery.use-case", () => ({
  SkillDiscoveryUseCase: vi.fn().mockImplementation(() => ({
    execute: discoveryExecuteMock
  }))
}));

describe("skills api", () => {
  it("supports list, detail, and discover endpoints", async () => {
    listSkillsExecuteMock.mockResolvedValue([
      {
        name: "Generate Soal Pilihan Ganda",
        slug: "generate-soal-pilihan-ganda",
        version: "1.0.0",
        category: "assessment",
        description: "Membuat soal",
        author: "ATIGA",
        tags: ["assessment"],
        isActive: true,
        filePath: "/skills/generate-soal-pilihan-ganda/skill.md",
        inputSchema: {},
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
      }
    ]);

    getSkillExecuteMock.mockResolvedValue({
      name: "Generate Soal Pilihan Ganda",
      slug: "generate-soal-pilihan-ganda",
      version: "1.0.0",
      category: "assessment",
      description: "Membuat soal",
      author: "ATIGA",
      tags: ["assessment"],
      isActive: true,
      filePath: "/skills/generate-soal-pilihan-ganda/skill.md",
      inputSchema: {},
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

    discoveryExecuteMock.mockResolvedValue({
      skills: [
        {
          name: "Generate Soal Pilihan Ganda",
          slug: "generate-soal-pilihan-ganda",
          version: "1.0.0",
          category: "assessment",
          description: "Membuat soal",
          author: "ATIGA",
          tags: ["assessment"],
          isActive: true,
          filePath: "/skills/generate-soal-pilihan-ganda/skill.md",
          inputSchema: {},
          outputSchema: {},
          promptTemplate: "",
          sections: {
            description: "",
            inputs: "",
            outputs: "",
            workflow: "",
            examples: "",
            prompt: ""
          },
          relevance: 7
        }
      ],
      total: 1
    });

    const { skillRoutes } = await import("../src/api/routes/skills");
    const routeMap = new Map<string, (request: unknown, reply: { success: (...args: unknown[]) => unknown; status: (code: number) => { success: (...args: unknown[]) => unknown } }) => Promise<unknown>>();

    const fastify = {
      get(
        path: string,
        optionsOrHandler:
          | ((request: unknown, reply: { success: (...args: unknown[]) => unknown; status: (code: number) => { success: (...args: unknown[]) => unknown } }) => Promise<unknown>)
          | Record<string, unknown>,
        handler?: (request: unknown, reply: { success: (...args: unknown[]) => unknown; status: (code: number) => { success: (...args: unknown[]) => unknown } }) => Promise<unknown>
      ) {
        routeMap.set(path, (typeof handler === "function" ? handler : optionsOrHandler) as never);
      },
      post(
        path: string,
        optionsOrHandler:
          | ((request: unknown, reply: { success: (...args: unknown[]) => unknown; status: (code: number) => { success: (...args: unknown[]) => unknown } }) => Promise<unknown>)
          | Record<string, unknown>,
        handler?: (request: unknown, reply: { success: (...args: unknown[]) => unknown; status: (code: number) => { success: (...args: unknown[]) => unknown } }) => Promise<unknown>
      ) {
        routeMap.set(`POST ${path}`, (typeof handler === "function" ? handler : optionsOrHandler) as never);
      },
      delete(
        path: string,
        optionsOrHandler:
          | ((request: unknown, reply: { success: (...args: unknown[]) => unknown; status: (code: number) => { success: (...args: unknown[]) => unknown } }) => Promise<unknown>)
          | Record<string, unknown>,
        handler?: (request: unknown, reply: { success: (...args: unknown[]) => unknown; status: (code: number) => { success: (...args: unknown[]) => unknown } }) => Promise<unknown>
      ) {
        routeMap.set(`DELETE ${path}`, (typeof handler === "function" ? handler : optionsOrHandler) as never);
      }
    };

    await skillRoutes(fastify as never);

    const listHandler = routeMap.get("/skills");
    const detailHandler = routeMap.get("/skills/:slug");
    const discoverHandler = routeMap.get("POST /skills/discover");

    const success = vi.fn();
    await listHandler?.({ query: {} }, { success, status: () => ({ success }) });
    await detailHandler?.({ params: { slug: "generate-soal-pilihan-ganda" } }, { success, status: () => ({ success }) });
    await discoverHandler?.({ body: { query: "soal", category: "assessment", limit: 10 } }, { success, status: () => ({ success }) });

    expect(listSkillsExecuteMock).toHaveBeenCalledTimes(1);
    expect(getSkillExecuteMock).toHaveBeenCalledWith("generate-soal-pilihan-ganda");
    expect(discoveryExecuteMock).toHaveBeenCalledTimes(1);
    expect(success).toHaveBeenCalled();
  });
});
