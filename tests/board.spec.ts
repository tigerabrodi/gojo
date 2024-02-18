import { test } from "@playwright/test";

test.use({ storageState: "playwright/.auth/user.json" });

test("Test requiring user to be logged in", async ({ page }) => {
  await page.goto("/boards");
  await page.getByRole("heading", { name: "Boards" }).isVisible();
});
