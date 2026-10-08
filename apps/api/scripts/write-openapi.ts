import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { generateOpenApiDocument } from '../src/openapi/generator.js';

/**
 * Writes the OpenAPI document to <repo root>/openapi.json WITHOUT starting
 * the server: no database, no Redis, no secrets needed (see the "runs
 * without a database" test). This is the first step of `npm run
 * generate:client`; the committed file is the contract the frontend client
 * is generated from.
 */
const target = fileURLToPath(new URL('../../../openapi.json', import.meta.url));

await writeFile(target, `${JSON.stringify(generateOpenApiDocument(), null, 2)}\n`);
console.log(`OpenAPI document written to ${target}`);
