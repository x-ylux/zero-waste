import { test, expect } from "@playwright/test";

test.describe("RescuePlate Core End-to-End Journey", () => {
  test.describe.configure({ mode: "serial" });

  test("loads landing page with architectural highlights and simulated demo banner", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "RescuePlate", exact: true })).toBeVisible();
    await expect(page.getByText("Simulated Demo Environment:")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Capacity-Aware Matching/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Transactional Split Allocation/ })).toBeVisible();
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
    await expect(page.getByText("Pickup Completion Rate", { exact: true })).toBeVisible();
  });

  test("completes a donor-to-NGO rescue, recovers a cancelled pickup, and resets demo data", async ({ page }) => {
    const title = `Browser Workflow Meal Batch ${Date.now()}`;
    const signIn = async (email: string) => {
      await page.goto("/auth/login");
      await page.getByLabel("Email Address").fill(email);
      await page.getByLabel("Password").fill("Password123!");
      await page.getByRole("button", { name: "Sign In" }).click();
    };

    await signIn("donor.mess@rescueplate.org");
    await expect(page).toHaveURL(/.*\/donor/);
    await page.goto("/donor/donations/create");
    await page.getByLabel("Listing Title").fill(title);
    await page.getByLabel("Quantity (Whole Integer)").fill("60");
    await page.getByLabel("Pickup Physical Address").fill("80 Feet Road, Koramangala, Bengaluru");
    await page.getByLabel("Latitude (Bengaluru)").fill("12.9345");
    await page.getByLabel("Longitude (Bengaluru)").fill("77.6265");
    await page.getByRole("button", { name: /Publish Surplus Batch/ }).click();
    await expect(page.getByText("Explainable Matching Engine")).toBeVisible();
    const donationUrl = page.url();

    await signIn("ngo.annapurna@rescueplate.org");
    await page.goto("/ngo/discover");
    const allocationResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/allocations") &&
        response.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Accept Portions" }).first().click();
    await page.getByRole("button", { name: "Confirm Atomic Allocation" }).click();
    const allocationResponse = await allocationResponsePromise;
    expect(allocationResponse.ok()).toBe(true);
    const allocationPayload = await allocationResponse.json();
    const allocationId: string = allocationPayload.allocation.id;

    await signIn("vol.aarav@rescueplate.org");
    await page.goto("/volunteer/assignments");
    await page.getByRole("button", { name: "Accept Offer" }).first().click();
    await expect(page.getByText("Assignment accepted.")).toBeVisible();
    await page.getByRole("button", { name: "Cancel Pickup" }).click();
    await page.getByLabel(/Mandatory Cancellation Reason/).fill("Unexpected vehicle issue during pickup.");
    await page.getByRole("button", { name: "Confirm Cancellation & Trigger Backup" }).click();
    await expect(page.getByText(/Backup volunteer successfully found/)).toBeVisible();

    await signIn("vol.priya@rescueplate.org");
    await page.goto("/volunteer/assignments");
    await page.getByRole("button", { name: "Accept Offer" }).first().click();
    await expect(page.getByText("Assignment accepted.")).toBeVisible();
    await page.getByRole("link", { name: "Start Handover" }).click();
    await page.getByRole("button", { name: "Generate 6-Digit Challenge" }).click();
    await expect(page.getByText("Demo Mode Challenge Code Helper:")).toBeVisible();
    await page.getByRole("button", { name: "Verify & Commit COLLECTION Handover" }).click();
    await expect(page.getByText("Stage: DELIVERY")).toBeVisible();

    await signIn("ngo.annapurna@rescueplate.org");
    await page.goto(`/handover/${allocationId}`);
    await expect(page.getByText("Stage: DELIVERY")).toBeVisible();
    await page.getByRole("button", { name: "Generate 6-Digit Challenge" }).click();
    await page.getByLabel("Verified Accepted Quantity (SERVINGS)").fill("58");
    await page.getByLabel("Rejected / Damaged Quantity (SERVINGS)").fill("2");
    await page.getByLabel("Mandatory Rejection Reason").fill("Two containers were damaged in transit.");
    await page.getByRole("button", { name: "Verify & Commit DELIVERY Handover" }).click();
    await expect(page.getByText("Handover Completed & Verified")).toBeVisible();
    await page.goto("/impact");
    await expect(page.getByText("Surplus Redistribution & Handover Metrics")).toBeVisible();

    await signIn("admin@rescueplate.org");
    await expect(page).toHaveURL(/.*\/admin/);
    await page.getByRole("button", { name: "Demo Controls" }).click();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Reset Demo Data" }).click();
    await expect(page.getByText(/Demo data reset:/)).toBeVisible();
    await expect(page).toHaveURL(/.*\/admin/);
    await expect(page.getByRole("button", { name: "Demo Controls", exact: true })).toBeVisible();
    expect(donationUrl).toContain("/donations/");
  });
});
