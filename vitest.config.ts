import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    projects: [
      {
        test: {
          name: "backend",
          globals: true,
          environment: "node",
          include: ["packages/*/tests/**/*.test.ts", "apps/api/tests/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "frontend",
          globals: true,
          environment: "jsdom",
          include: ["apps/web/tests/**/*.test.{ts,tsx}"],
          setupFiles: ["apps/web/tests/setup.ts"],
        },
      },
    ],
  },
});
