import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Example: Disable the rule that checks for missing dependencies in React hooks
      "react-hooks/exhaustive-deps": "off",
      
      // Example: Allow console.log statements
      "no-console": "off",
      
      // Example: Turn other rules into warnings instead of errors
      // "no-unused-vars": "warn",
      
      // Add more rules to disable or modify as needed
    }
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
