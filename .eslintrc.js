module.exports = {
	root: true,
	env: {
		node: true,
		es6: true,
	},
	parser: '@typescript-eslint/parser',
	parserOptions: {
		ecmaVersion: 2020,
		sourceType: 'module',
	},
	plugins: ['n8n-nodes-base'],
	extends: [
		'eslint:recommended',
		'plugin:n8n-nodes-base/community',
	],
	rules: {
		'no-unused-vars': 'error',
		'no-console': 'warn',
		'prefer-const': 'error',
	},
	ignorePatterns: ['dist/', 'node_modules/', '*.js'],
};
