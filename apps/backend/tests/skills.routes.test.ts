import { describe, expect, it, vi } from "vitest";

const listSkillsExecuteMock = vi.fn();

vi.mock("../src/application/use-cases/skill-use-cases", () => ({
  ListSkillsUseCase: vi.fn().mockImplementation(() => ({
    execute: listSkillsExecuteMock
  })),
  GetSkillBySlugUseCase: vi.fn()
}));

describe("skill routes", () => {
  it("returns unique skill categories", async () => {
    listSkillsExecuteMock.mockResolvedValue([
      {
        name: "Skill A",
        slug: "skill-a",
        version: "1.0.0",
        category: "assessment",
        description: "Skill pertama",
        author: "ATIGA",
        isActive: true,
        filePath: "/skills/skill-a",
        sections: {
          description: "",
          inputs: "",
          outputs: "",
          workflow: "",
          examples: ""
        }
      },
      {
        name: "Skill B",
        slug: "skill-b",
        version: "1.0.0",
        category: "assessment",
        description: "Skill kedua",
        author: "ATIGA",
        isActive: true,
        filePath: "/skills/skill-b",
        sections: {
          description: "",
          inputs: "",
          outputs: "",
          workflow: "",
          examples: ""
        }
      }
    ]);

    const { skillRoutes } = await import("../src/api/routes/skills");

    const routeMap = new Map<string, (request: unknown, reply: { success: (...args: unknown[]) => unknown }) => Promise<unknown>>();
    const fastify = {
      get(
        path: string,
        optionsOrHandler:
          | ((request: unknown, reply: { success: (...args: unknown[]) => unknown }) => Promise<unknown>)
          | Record<string, unknown>,
        handler?: (request: unknown, reply: { success: (...args: unknown[]) => unknown }) => Promise<unknown>
      ) {
        routeMap.set(path, (typeof handler === "function" ? handler : optionsOrHandler) as never);
      },
      post() {
        return undefined;
      },
      delete() {
        return undefined;
      }
    };

    await skillRoutes(fastify as never);
    const handler = routeMap.get("/skills/categories");

    const success = vi.fn();
    await handler?.({}, { success });

    expect(listSkillsExecuteMock).toHaveBeenCalledTimes(1);
    expect(success).toHaveBeenCalledTimes(1);
    expect(success.mock.calls[0]?.[0]).toEqual({ categories: ["assessment"] });
    expect(success.mock.calls[0]?.[1]).toBe("Daftar kategori skill");
    expect(success.mock.calls[0]?.[2]).toBe("SKILLS_CATEGORIES_LIST");
  });
});
