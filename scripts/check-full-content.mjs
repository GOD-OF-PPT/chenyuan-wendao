import { validateContent } from '../src/full/validate-content.ts';

try {
  console.log(JSON.stringify(validateContent(), null, 2));
} catch (error) {
  console.error(`${error.code ?? 'CONTENT_AUDIT'}: ${error.message}`);
  process.exitCode = 1;
}
