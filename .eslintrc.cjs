// -*- Javascript -*-

module.exports = {
  "env": {
    "browser": true,
    "es2021": true,
    "node": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 12,
    "sourceType": "module",
    "project": "./tsconfig.json",
  },
  "plugins": [
    "@typescript-eslint"
  ],
  "rules": {
    "indent": [
      "error",
      2,
    ],
    "linebreak-style": [
      "error",
      "unix",
    ],
    "semi": [
      "error",
      "always"
    ],
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        "varsIgnorePattern": "_.*",
        "argsIgnorePattern": "_.*",
      },
    ],
    "@typescript-eslint/no-inferrable-types": "off",
    "prefer-const": [
      "error",
      {
        "destructuring": "all",
      },
    ],
    "no-constant-condition": [
      "error",
      {
        "checkLoops": false,
      },
    ],
    "@typescript-eslint/no-floating-promises": [
      "error",
      {},
    ]
  }
};
