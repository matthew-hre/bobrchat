import antfu from "@antfu/eslint-config";
import eslintPluginBetterTailwindcss from "eslint-plugin-better-tailwindcss";

export default antfu({
  formatters: true,
  react: true,
  nextjs: true,
  typescipt: false,
  // typescript: { tsconfigPath: "tsconfig.json" }, TODO: handle TS errors
  stylistic: {
    indent: 2,
    semi: true,
    quotes: "double",
  },
  ignores: ["**/nix/**", "**/.direnv/**", "**/node_modules/**", "**/.next/**", "**/.direnv/**", "**/components/ui/**"],
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
    "react-hooks-extra/no-direct-set-state-in-use-effect": "off",
    "no-console": "warn",
    "antfu/no-top-level-await": ["off"],
    "node/prefer-global/process": ["off"],
    "node/no-process-env": ["error"],
    "react-refresh/only-export-components": "off",
    "perfectionist/sort-imports": ["error", { tsconfigRootDir: "." }],
    "react-x/no-implicit-key": "off",
    "react/no-implicit-key": "off",
    "unicorn/filename-case": [
      "error",
      {
        case: "kebabCase",
        ignore: ["README.md", "AGENTS.md", "CONTRIBUTING.md"],
      },
    ],
  },
});
