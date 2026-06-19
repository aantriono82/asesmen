import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@testing-library/react";
import { DashboardClient } from "./DashboardClient";

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: jest.fn()
  })
}));

jest.mock("@lib/auth", () => ({
  getStoredUser: () => ({
    id: "1",
    name: "Teacher",
    email: "teacher@example.com",
    role: "teacher",
    isActive: true
  }),
  isTeacher: () => true
}));

jest.mock("@lib/api", () => ({
  apiFetch: jest.fn().mockResolvedValue({
    data: [
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
      },
      {
        name: "Skill C",
        slug: "skill-c",
        version: "1.0.0",
        category: "assessment",
        description: "Skill ketiga",
        author: "ATIGA",
        isActive: true,
        filePath: "/skills/skill-c",
        sections: {
          description: "",
          inputs: "",
          outputs: "",
          workflow: "",
          examples: ""
        }
      },
      {
        name: "Skill D",
        slug: "skill-d",
        version: "1.0.0",
        category: "assessment",
        description: "Skill keempat",
        author: "ATIGA",
        isActive: true,
        filePath: "/skills/skill-d",
        sections: {
          description: "",
          inputs: "",
          outputs: "",
          workflow: "",
          examples: ""
        }
      },
      {
        name: "Skill E",
        slug: "skill-e",
        version: "1.0.0",
        category: "assessment",
        description: "Skill kelima",
        author: "ATIGA",
        isActive: true,
        filePath: "/skills/skill-e",
        sections: {
          description: "",
          inputs: "",
          outputs: "",
          workflow: "",
          examples: ""
        }
      },
      {
        name: "Skill F",
        slug: "skill-f",
        version: "1.0.0",
        category: "assessment",
        description: "Skill keenam",
        author: "ATIGA",
        isActive: true,
        filePath: "/skills/skill-f",
        sections: {
          description: "",
          inputs: "",
          outputs: "",
          workflow: "",
          examples: ""
        }
      }
    ]
  })
}));

describe("DashboardClient", () => {
  it("renders fetched skills", async () => {
    const user = userEvent.setup();
    render(<DashboardClient />);

    await waitFor(() => {
      expect(screen.getByText("Skill A")).toBeInTheDocument();
    });

    expect(screen.getByText("Skill D")).toBeInTheDocument();
    expect(screen.queryByText("Skill E")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "2" }));

    expect(screen.getByText("Skill E")).toBeInTheDocument();
    expect(screen.getByText("Skill F")).toBeInTheDocument();
  });
});
