import { expect, test } from "@playwright/test";

test("serves an installable manifest and offline fallback", async ({ request }) => {
  const manifestResponse = await request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  expect(manifest.name).toBe("Omkar Marketing Business Management");
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ sizes: "192x192" }),
      expect.objectContaining({ sizes: "512x512" }),
    ]),
  );

  const offlineResponse = await request.get("/offline.html");
  expect(offlineResponse.ok()).toBe(true);
  expect(await offlineResponse.text()).toContain("You are offline");
});
