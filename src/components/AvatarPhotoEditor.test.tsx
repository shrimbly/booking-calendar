import { fireEvent, render, screen } from "@testing-library/react";
import { cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AvatarPhotoEditor } from "./AvatarPhotoEditor";

describe("AvatarPhotoEditor mobile remove confirmation", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("requires a second touch tap before removing an existing profile photo", () => {
    const onRemove = vi.fn();

    render(
      <AvatarPhotoEditor
        initial="M"
        color="#2a2a2a"
        imageUrl="https://example.com/profile.jpg"
        onRemove={onRemove}
      />,
    );

    const removeButton = screen.getByRole("button", {
      name: "Remove profile photo",
    });

    fireEvent.pointerDown(removeButton, { pointerType: "touch" });
    fireEvent.click(removeButton);

    expect(onRemove).not.toHaveBeenCalled();
    expect(
      screen
        .getByRole("button", {
          name: "Tap again to remove profile photo",
        })
        .getAttribute("aria-pressed"),
    ).toBe("true");

    fireEvent.pointerDown(removeButton, { pointerType: "touch" });
    fireEvent.click(removeButton);

    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("keeps mouse removal as a single click", () => {
    const onRemove = vi.fn();

    render(
      <AvatarPhotoEditor
        initial="M"
        color="#2a2a2a"
        imageUrl="https://example.com/profile.jpg"
        onRemove={onRemove}
      />,
    );

    const removeButton = screen.getByRole("button", {
      name: "Remove profile photo",
    });

    fireEvent.pointerDown(removeButton, { pointerType: "mouse" });
    fireEvent.click(removeButton);

    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
