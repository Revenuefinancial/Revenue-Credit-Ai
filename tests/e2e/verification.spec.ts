import { test, expect } from "@playwright/test";

// These cover the identity-verification feature on the public, no-auth pages:
// the marketing walkthrough (/how-it-works) and the interactive demo (/demo).
// The authenticated upload + admin-review flow is exercised against the live
// deploy once the verification_documents migration is applied.

test.describe("how-it-works documents the verification step", () => {
  test("client + admin steps and FAQ mention identity verification", async ({
    page,
  }) => {
    await page.goto("/how-it-works");

    // Client journey gained a "Verify your identity" step.
    await expect(
      page.getByRole("heading", { name: "Verify your identity" }),
    ).toBeVisible();

    // Admin journey gained a document-review step.
    await expect(
      page.getByRole("heading", { name: "Verify their identity documents" }),
    ).toBeVisible();

    // FAQ explains why documents are required.
    await expect(
      page.getByRole("heading", {
        name: /Why do I have to upload my ID/i,
      }),
    ).toBeVisible();
  });

  test("View tutorial button launches the guided tour", async ({ page }) => {
    await page.goto("/how-it-works");

    await page.getByRole("button", { name: /View tutorial/ }).click();

    // The spotlight overlay shows a "Step 1 of N" tooltip.
    await expect(page.getByText(/Step 1 of/)).toBeVisible();
  });
});

test.describe("admin Tutorials hub deep-links auto-start a tour", () => {
  test("?tour=start launches the page's tour on arrival", async ({ page }) => {
    // The hub links each tutorial to `{path}?tour=start`; the global Help
    // launcher reads that param and opens the spotlight tour automatically.
    await page.goto("/?tour=start");

    await expect(page.getByText(/Step 1 of/)).toBeVisible();
  });
});

test.describe("demo walkthrough includes the verification chapter", () => {
  test("client sees three document categories with statuses", async ({
    page,
  }) => {
    await page.goto("/demo");

    // Step through chapters until the verification one is on screen.
    // It is chapter 5 ("Verify your identity").
    const next = page.getByRole("button", { name: /Next/ });
    for (let i = 0; i < 4; i++) await next.click();

    await expect(
      page
        .getByRole("main")
        .getByRole("heading", { name: "Verify your identity", level: 2 }),
    ).toBeVisible();

    // The three required categories render.
    await expect(page.getByText("Photo ID", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Proof of Address", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Proof of SSN", { exact: true })).toBeVisible();

    // Mixed statuses: approved categories plus one awaiting review.
    await expect(page.getByText("Awaiting review").first()).toBeVisible();
    await expect(page.getByText("Approved").first()).toBeVisible();
  });

  test("admin detail shows the verification review panel", async ({ page }) => {
    await page.goto("/demo");

    // Advance to the "Open a client — ready to draft" chapter (adminDetail).
    const next = page.getByRole("button", { name: /Next/ });
    for (let i = 0; i < 6; i++) await next.click();

    await expect(
      page.getByRole("heading", { name: "Identity verification" }),
    ).toBeVisible();

    // Reviewer controls are present.
    await expect(
      page.getByText("Review each document, then approve or reject it.", {
        exact: false,
      }),
    ).toBeVisible();
  });
});
