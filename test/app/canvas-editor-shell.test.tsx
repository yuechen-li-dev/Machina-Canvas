// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../../src/app/shell/CanvasEditorShell";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("CanvasEditorShell integration", () => {
  it("composes panels and routes a guide file through the async coordinator", async () => {
    const { container } = render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Open Graphics editing" }));
    expect(screen.getByText("Command log")).toBeTruthy();

    const guideInput = container.querySelector<HTMLInputElement>(
      'input[accept=".toml,.guide.toml,text/plain"]',
    );
    expect(guideInput).toBeTruthy();
    fireEvent.change(guideInput as HTMLInputElement, {
      target: {
        files: [
          new File(['[guide]\nid = "shell-guide"\nunits = "px"\n'], "shell.guide.toml", {
            type: "text/plain",
          }),
        ],
      },
    });

    expect(await screen.findByRole("heading", { name: "shell.guide.toml" })).toBeTruthy();
  });

  it("projects async parse errors rather than swallowing them", async () => {
    const { container } = render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Open Graphics editing" }));
    const guideInput = container.querySelector<HTMLInputElement>(
      'input[accept=".toml,.guide.toml,text/plain"]',
    );
    fireEvent.change(guideInput as HTMLInputElement, {
      target: {
        files: [new File(["not valid toml = ["], "broken.guide.toml", { type: "text/plain" })],
      },
    });
    expect(await screen.findByText(/^InvalidTomlSyntax:/)).toBeTruthy();
  });
});
