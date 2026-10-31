import globals from 'globals';

const config = [
  {
    // Skip dot directories, the build output and Nunjucks templates
    ignores: ['.*/**', 'build/**', 'src/**/*.html'],
  },
  {
    space: true,
    prettier: true,
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      'capitalized-comments': 'off',
      curly: ['error', 'multi-line'],
      '@eslint-community/eslint-comments/require-description': 'off',
      'import-x/order': 'off',
      'jsdoc/require-asterisk-prefix': 'off',
      'no-multi-assign': 'off',
      'no-negated-condition': 'off',
      'no-shadow': 'error',
      'prefer-template': 'error',
      // Keep the project's Prettier style (bracket spacing on)
      'prettier/prettier': [
        'error',
        {
          bracketSpacing: true,
          singleQuote: true,
          trailingComma: 'all',
        },
      ],
      'require-unicode-regexp': 'off',
      'spaced-comment': 'off',
      '@stylistic/no-mixed-operators': 'off',
      'unicorn/better-dom-traversing': 'off',
      'unicorn/consistent-class-member-order': 'off',
      'unicorn/explicit-length-check': 'off',
      'unicorn/logical-assignment-operators': 'off',
      'unicorn/name-replacements': 'off',
      'unicorn/no-computed-property-existence-check': 'off',
      'unicorn/no-global-object-property-assignment': 'off',
      'unicorn/no-immediate-mutation': 'off',
      'unicorn/no-top-level-side-effects': 'off',
      'unicorn/no-undeclared-class-members': 'off',
      'unicorn/no-unused-properties': 'error',
      'unicorn/numeric-separators-style': 'off',
      'unicorn/prefer-add-event-listener': 'off',
      'unicorn/prefer-class-fields': 'off',
      'unicorn/prefer-early-return': 'off',
      'unicorn/prefer-global-this': 'off',
      'unicorn/prefer-module': 'off',
      'unicorn/prefer-number-coercion': 'off',
      'unicorn/prefer-private-class-fields': 'off',
      'unicorn/prefer-scoped-selector': 'off',
      'unicorn/prefer-simple-condition-first': 'off',
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/require-post-message-target-origin': 'off',
      'unicorn/single-line-block-comment-style': 'off',
    },
  },
];

export default config;
