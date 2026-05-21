import { fireEvent, render, screen } from "@testing-library/react";
import { cleanup } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "./ThemeToggle";

function mockSystemTheme(isDark: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-color-scheme: dark") && isDark,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe("ThemeToggle motion contract", () => {
  beforeEach(() => {
    mockSystemTheme(false);
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.classList.remove("theme-ready");
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("keeps the icons traveling and rotating between light and dark states", () => {
    render(<ThemeToggle />);

    const button = screen.getByRole("button", { name: "Switch to dark theme" });
    const sun = screen.getByTestId("theme-toggle-sun");
    const moon = screen.getByTestId("theme-toggle-moon");

    expect(sun.className).toContain("translate-y-0");
    expect(sun.className).toContain("rotate-0");
    expect(sun.className).toContain("opacity-100");
    expect(moon.className).toContain("translate-y-[34px]");
    expect(moon.className).toContain("-rotate-[135deg]");
    expect(moon.className).toContain("opacity-0");

    fireEvent.click(button);

    expect(
      screen.getByRole("button", { name: "Switch to light theme" }),
    ).toBeTruthy();
    expect(sun.className).toContain("-translate-y-[28px]");
    expect(sun.className).toContain("rotate-[135deg]");
    expect(sun.className).toContain("opacity-0");
    expect(moon.className).toContain("translate-y-0");
    expect(moon.className).toContain("rotate-0");
    expect(moon.className).toContain("opacity-100");
  });

  it("keeps individual transform properties in the icon transition", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const iconTransition = css.match(
      /\.theme-toggle-icon\s*{(?<body>[\s\S]*?)}/,
    )?.groups?.body;

    expect(iconTransition).toContain("translate 620ms");
    expect(iconTransition).toContain("rotate 620ms");
    expect(iconTransition).toContain("scale 620ms");
    expect(iconTransition).toContain("filter 460ms");
  });
});
