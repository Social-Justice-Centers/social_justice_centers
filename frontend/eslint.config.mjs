import { defineConfig, globalIgnores } from "eslint/config";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const filename = fileURLToPath(import.meta.url);
const dirname = dirname(filename);

const compat = new FlatCompat({
  baseDirectory: dirname,
});

const eslintConfig = defineConfig([
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // Override default ignores of eslint-config-next.
  globalIgnores([
    "jest.config.js",
    "jest.setup.js",
    // Default ignores of eslint-config-next:
    ".next/",
    "out/",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;