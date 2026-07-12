// ESLint 9 flat config — replaces .eslintrc.json (Next 16 removed `next lint`;
// the lint script now runs the eslint CLI directly).
import coreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "public/sw.js",
      "public/fallback-*.js",
      // Separate projects with their own tooling, never linted by next lint.
      "contracts/**",
      "services/**",
    ],
  },
  ...coreWebVitals,
  ...nextTypescript,
];
