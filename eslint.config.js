import currentThing from "eslint-config-current-thing";

const tsFiles = ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"]

export default [
  ...currentThing(),
  {
    files: tsFiles,
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.app.json",
      },
    },
  },

{
  rules: {
    "react/react-in-jsx-scope": 0,
  }
}
];
