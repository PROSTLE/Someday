"use client";

import { Icon } from "./Icon";

export function ThemeToggle() {
  const toggle = () => {
    const root = document.documentElement;
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("someday-theme", next);
    } catch {
      // The theme still applies for this visit.
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Switch between light and dark"
      className="inline-flex size-11 items-center justify-center rounded-[10px] border border-edge hover:bg-tint"
    >
      <Icon name="moon" size={20} />
    </button>
  );
}
