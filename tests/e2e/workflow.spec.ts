import { test, expect } from "@playwright/test";

test.describe("RescuePlate Core End-to-End Journey", () => {
  test("loads landing page with architectural highlights and simulated demo banner", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("RescuePlate")).toBeVisible();
    await expect(page.getByText("Simulated Demo Environment:")).toBeVisible();
    await expect(page.getByText("Capacity-Aware Matching")).toBeVisible();
    await expect(page.getByText("Transactional Split Allocation")).toBeVisible();
  });

  test("signs in with synthetic donor credentials and views donor portal", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.getByRole("heading", { name: "Sign In to RescuePlate" })).toBeVisible();

    // Select Suresh Patil (Mess Manager) demo persona
    await page.getByText("Suresh Patil").click();
    await page.getByRole("button", { name: "Sign In" }).click();

    // Verify redirected to donor dashboard
    await expect(page).toHaveURL(/.*\/donor/);
    await expect(page.getByText("Surplus Food Inventory & Allocations")).toBeVisible();
  });

  test("loads operational impact dashboard with real separated unit metrics", async ({ page }) => {
    await page.goto("/impact");
    await expect(page.getByText("Surplus Redistribution & Handover Metrics")).toBeVisible();
    await expect(page.getByText("Portioned Meals (SERVINGS)")).toBeVisible();
    await expect(page.getByText("Bulk Produce & Groceries (KG)")).toBeVisible();
    await expect(page.getByText("Pickup Completion Rate")).toBeVisible();
  });
});

