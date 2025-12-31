import antfu from "@antfu/eslint-config";
import eslintPluginBetterTailwindcss from "eslint-plugin-better-tailwindcss";

export default antfu({
  formatters: true,
  react: true,
  nextjs: true,
  stylistic: {
    indent: 2,
    semi: true,
    quotes: "double",
  },
  ignores: ["**/nix/**", "**/node_modules/**", "**/.next/**", "**/.direnv/**"],

}, {
  plugins: {
    "better-tailwindcss": eslintPluginBetterTailwindcss,
  },
  rules: {
    ...eslintPluginBetterTailwindcss.configs["recommended-warn"].rules,
    "better-tailwindcss/no-unregistered-classes": "off",
    "better-tailwindcss/no-conflicting-classes": "off",
  },
}, {
  rules: {
    "ts/no-redeclare": "off",
    "ts/consistent-type-definitions": ["error", "type"],
    "no-console": "warn",
    "antfu/no-top-level-await": ["off"],
    "node/prefer-global/process": ["off"],
    "node/no-process-env": ["error"],
    "react-refresh/only-export-components": "off",
    "perfectionist/sort-imports": ["error", { tsconfigRootDir: "." }],
    "unicorn/filename-case": [
      "error",
      {
        case: "kebabCase",
        ignore: ["README.md", "AGENTS.md"],
      },
    ],
  },
});
