import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BOOKING_TUTORIAL_OPEN_EVENT } from "@/lib/booking-tutorial";
import { IdentityPicker } from "./IdentityPicker";

vi.mock("@/app/actions", () => ({
  setIdentity: vi.fn(),
  updateMyProfile: vi.fn(),
  uploadProfileImage: vi.fn(),
  removeProfileImage: vi.fn(),
}));

const people = [
  {
    id: "mary",
    first: "Mary",
    initial: "M",
    color: "#6b7a8b",
    imageUrl: null,
  },
  {
    id: "willie",
    first: "Willie",
    initial: "W",
    color: "#3a4e48",
    imageUrl: null,
  },
];

describe("IdentityPicker outside interactions", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("closes when a calendar grid pointerdown prevents the follow-up mouse event", () => {
    render(
      <>
        <IdentityPicker people={people} currentId="mary" />
        <div
          data-testid="calendar-cell"
          onPointerDown={(event) => event.preventDefault()}
        />
      </>,
    );

    const trigger = screen.getByRole("button", {
      name: "Edit profile for Mary",
    });

    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    fireEvent.pointerDown(screen.getByTestId("calendar-cell"));

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("renders a themed blur wash behind the open menu", async () => {
    render(<IdentityPicker people={people} currentId="mary" />);

    const trigger = screen.getByRole("button", {
      name: "Edit profile for Mary",
    });

    fireEvent.click(trigger);

    await waitFor(() => {
      expect(document.querySelector(".themed-overlay-wash")).toBeTruthy();
    });

    const wash = document.querySelector(".themed-overlay-wash") as HTMLElement;
    const menu = screen.getByRole("dialog", { name: "Your profile" });
    expect(wash.className).toContain("fixed inset-0");
    expect(wash.style.backdropFilter).toBe("blur(4px)");
    expect(menu.className).toContain("fixed z-20");
    expect(menu.parentElement).toBe(document.body);

    fireEvent.pointerDown(wash);

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("opens the booking tutorial from the profile menu and closes the menu", async () => {
    const onOpenTutorial = vi.fn();
    window.addEventListener(BOOKING_TUTORIAL_OPEN_EVENT, onOpenTutorial);

    render(<IdentityPicker people={people} currentId="mary" />);

    const trigger = screen.getByRole("button", {
      name: "Edit profile for Mary",
    });

    fireEvent.click(trigger);

    const tutorialButton = await screen.findByRole("button", {
      name: /how to book/i,
    });
    fireEvent.click(tutorialButton);

    expect(onOpenTutorial).toHaveBeenCalledTimes(1);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    window.removeEventListener(BOOKING_TUTORIAL_OPEN_EVENT, onOpenTutorial);
  });
});
