import { test as base } from "@playwright/test";

// Playwright captures each server's assigned URL before starting test workers.
export const test = base.extend({
  baseURL: async ({}, use, testInfo) => {
    const key = `VIM_FLOW_${testInfo.project.name.toUpperCase()}_URL`;
    const url = process.env[key];
    if (!url) throw new Error(`Missing browser test server URL: ${key}`);
    await use(url);
  },
});

export { expect } from "@playwright/test";
