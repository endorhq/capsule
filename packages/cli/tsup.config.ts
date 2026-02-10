import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm'],
	target: 'node20',
	outDir: 'dist',
	clean: true,
	splitting: false,
	sourcemap: true,
	dts: false,
	noExternal: ['@logs/shared'],
	banner: {
		js: '#!/usr/bin/env node'
	}
});
