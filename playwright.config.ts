import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  use: {
    browserName: "chromium",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    },
    trace: "retain-on-failure",
  },
  projects: [
    { name: "development" },
    { name: "production" },
  ],
  webServer: [
    {
      command: "bun --hot --port 0 index.html",
      wait: {
        stdout: /(?<vim_flow_development_url>http:\/\/localhost:\d+)\//,
      },
      timeout: 30_000,
    },
    {
      command: "bun run preview",
      env: { PORT: "0" },
      wait: {
        stdout: /Production preview: (?<vim_flow_production_url>http:\/\/localhost:\d+)\//,
      },
      timeout: 30_000,
    },
  ],
});
