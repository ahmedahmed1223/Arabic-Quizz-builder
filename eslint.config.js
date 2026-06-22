import js from "@eslint/js";

export default [
  {
    ignores: ["src/vendor/**"]
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        console: "readonly",
        fetch: "readonly",
        AudioContext: "readonly",
        FileReader: "readonly",
        alert: "readonly",
        confirm: "readonly",
        prompt: "readonly",
        navigator: "readonly",
        ErrorBus: "readonly",
        I18n: "readonly",
        QuizStorage: "readonly",
        state: "writable",
        toast: "readonly",
        applyFontScale: "readonly",
        t: "readonly",
        module: "readonly",
        exports: "readonly",
        define: "readonly",
        Buffer: "readonly",
        TextDecoder: "readonly",
        TextEncoder: "readonly",
        globalThis: "readonly",
        process: "readonly",
        __dirname: "readonly"
      }
    },
    rules: {
      "no-unused-vars": "off",
      "no-undef": "off",
      "no-empty": "off",
      "no-redent": "off",
      "no-redeclare": "off",
      "no-useless-escape": "off",
      "no-control-regex": "off",
      "no-fallthrough": "off",
      "no-cond-assign": "off",
      "no-constant-condition": "off",
      "no-inner-declarations": "off",
      "no-prototype-builtins": "off",
      "no-regex-spaces": "off",
      "no-mixed-spaces-and-tabs": "off",
      "no-unused-labels": "off",
      "no-func-assign": "off",
      "no-dupe-keys": "off",
      "no-const-assign": "off",
      "no-unsafe-negation": "off",
      "no-constant-binary-expression": "off",
      "no-dupe-else-if": "off"
    }
  }
];
