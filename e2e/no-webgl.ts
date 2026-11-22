import type { Page } from "@playwright/test";

type GetContext = (
  this: HTMLCanvasElement,
  type: string,
  options?: unknown,
) => RenderingContext | null;

/** Make every WebGL context fail, as on a machine without it. */
export async function withoutWebGL(page: Page): Promise<void> {
  // The callback runs in the browser, so it can use nothing from this module
  // except types.
  await page.addInitScript(() => {
    // oxlint-disable-next-line typescript/unbound-method -- only ever invoked through `.call(this, ...)`
    const original = HTMLCanvasElement.prototype.getContext;

    const getContext: GetContext = function (this, type, options) {
      if (type.startsWith("webgl")) {
        return null;
      }

      return original.call(this, type, options);
    };

    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      writable: true,
      value: getContext,
    });
  });
}
