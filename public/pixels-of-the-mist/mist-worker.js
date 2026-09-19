/* Generation worker.
 *
 * Levels are built off the main thread so the board never hitches, and the
 * next level is generated while the player is still solving the current one -
 * at a median of about 20ms per level there is never a wait.
 */
'use strict';
importScripts('mist-engine.js', 'mist-generate.js');

self.onmessage = function (e) {
  const { id, stage, seed } = e.data;
  const t0 = Date.now();
  let level = null, error = null;
  try {
    level = generateFrom(stage, seed >>> 0);
  } catch (err) {
    error = String(err && err.stack || err);
  }
  self.postMessage({ id, level, error, ms: Date.now() - t0 });
};
