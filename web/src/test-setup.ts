import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom does not implement matchMedia; the theme + count-up hooks call it. Report
// reduced-motion as ON so useCountUp settles to its target synchronously in tests.
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

afterEach(() => cleanup());
