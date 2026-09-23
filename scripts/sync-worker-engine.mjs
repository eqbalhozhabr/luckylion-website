// The Worker needs to run the exact same puzzle engine the browser does, so
// a level the server refuses to hand out is never one the client happens to
// generate differently. Rather than maintaining a second copy by hand (which
// drifts the moment one side gets edited and the other doesn't), this
// concatenates the two shipped browser files verbatim and appends a static
// `export` footer, producing a real ES module the Worker's bundler (esbuild,
// via Wrangler) resolves entirely at build time.
//
// This is NOT the same as eval-ing the source at runtime (which Cloudflare's
// Workers runtime flatly refuses - "Code generation from strings disallowed
// for this context", even in local `wrangler dev`): mist-engine.js and
// mist-generate.js are themselves ordinary classic scripts (top-level const/
// function/class, no import or export of their own, verified to touch no
// self/window/document), so concatenating them and adding one export
// statement turns the whole thing into a normal, statically-analyzable
// module - nothing about the two source files changes, and this generated
// file is never hand-edited.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const srcDir = join(root, 'public', 'pixels-of-the-mist');
const outDir = join(root, 'worker', 'generated');
mkdirSync(outDir, { recursive: true });

const engine = readFileSync(join(srcDir, 'mist-engine.js'), 'utf8');
const generate = readFileSync(join(srcDir, 'mist-generate.js'), 'utf8');
const footer = '\nexport { generateFrom, generateFromBanded };\n';
writeFileSync(join(outDir, 'engine-bundle.mjs'), `${engine}\n${generate}\n${footer}`);

console.log('worker/generated/engine-bundle.mjs synced from public/pixels-of-the-mist/*.js');
