import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "public/**", "src/docs/**"]),
  {
    files: ["**/*.cjs", "scripts/**/*.js"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    // Netlify deploy functions still use CommonJS, including existing
    // inline require suppressions. Do not rewrite unrelated server code.
    files: ["netlify/functions/**/*.js"],
    linterOptions: { reportUnusedDisableDirectives: "off" },
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    // Next registers React Hooks plugins for app/source modules. Keep those
    // rule overrides out of root configs (e.g. tailwind.config.ts) so a
    // normal repository-wide lint does not fail on a missing plugin mapping.
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/rules-of-hooks": "warn",
      "react/no-unescaped-entities": "warn",
      "@next/next/no-img-element": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "prefer-const": "warn",
    },
  },
])
