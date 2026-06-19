import { render, screen } from "@testing-library/react";
import { AuthForm } from "./AuthForm";

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn()
  })
}));

describe("AuthForm", () => {
  it("renders login mode fields", () => {
    render(<AuthForm mode="login" />);

    expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.queryByLabelText("Nama")).not.toBeInTheDocument();
  });
});
