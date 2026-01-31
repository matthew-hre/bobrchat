import antfu from "@antfu/eslint-config";

export default antfu({
  formatters: true,
  stylistic: {
    indent: 2,
    semi: true,
    quotes: "double",
  },
  ignores: ["node_modules/**", "dist/**", ".wrangler/**"],
}, {
  rules: {
    "ts/no-redeclare": "off",
    "ts/consistent-type-definitions": ["error", "type"],
    "antfu/no-top-level-await": "off",
    "node/no-process-env": "off",
    "unicorn/filename-case": [
      "error",
      {
        case: "kebabCase",
        ignore: ["README.md"],
      },
    ],
  },
});
