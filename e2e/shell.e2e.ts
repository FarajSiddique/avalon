import { expect, test } from "@playwright/test";

/*
 * What the Worker sends, and what appears once the page runs in the
 * browser. The sky and the stage are drawn in the browser only, so the
 * Worker's page stays light (see "Rendering" in docs/design-system.md).
 */

for (const path of ["/", "/design/starlit"]) {
  test(`the Worker sends ${path} without the sky or the stage`, async ({
    request,
  }) => {
    const html = await (await request.get(path)).text();

    expect(html).not.toContain("data-art=");
    expect(html).not.toContain("data-stage-host");
    expect(html).toContain("Create a room");
  });

  test(`the sky appears once ${path} is running`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('[data-art="night-sky"]')).toBeAttached();
  });
}
