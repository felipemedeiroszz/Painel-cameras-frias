const eslintJs = require("@eslint/js");
const tseslint = require("typescript-eslint");

module.exports = tseslint.config(
  eslintJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname
      }
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }
      ]
    }
  }
);
