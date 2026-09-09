import { isBuiltin } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    console.error('DEBUG CATCH:', specifier, 'parent:', context.parentURL);
    if (specifier.startsWith('.') || specifier.startsWith('/')) {
      const parent = context.parentURL ? new URL(context.parentURL) : pathToFileURL(process.cwd() + '/');
      const resolved = new URL(specifier, parent);
      if (resolved.protocol === 'file:') {
        const filePath = fileURLToPath(resolved);
        if (existsSync(filePath + '.ts')) {
          return { url: resolved.href + '.ts', shortCircuit: true };
        }
        if (existsSync(filePath + '.js')) {
          return { url: resolved.href + '.js', shortCircuit: true };
        }
        if (existsSync(filePath + '/index.ts')) {
          return { url: resolved.href + '/index.ts', shortCircuit: true };
        }
      }
    }
    throw err;
  }
}
