/* Generation worker.
 *
 * Levels are built off the main thread so the board never hitches, and the
 * next level is generated while the player is still solving the current one -
 * at a median of about 20ms per level there is never a wait.
 *
 * The worker is also where the answer stays. The page is sent the map and the
 * testimony but not the solution, because it does not need it: the generator
 * guarantees each level has exactly one legal arrangement, so a submission
 * that satisfies every clue IS the solution, and the page can check that on
 * its own. Only Reveal wants the fires themselves, and it asks for them.
 *
 * Generation is deterministic in the seed, so answering that request costs one
 * rebuild rather than a stored answer sitting in the page's memory.
 */
'use strict';
importScripts('mist-engine.js', 'mist-generate.js');

/* The two fields that give the game away. `monsters` is the fog set of the
   winning arrangement, which the page recomputes from the fires it is showing
   anyway, so nothing is lost by withholding it. */
function withoutAnswer(level) {
  if (!level) return level;
  const out = {};
  for (const k in level) if (k !== 'solution' && k !== 'monsters') out[k] = level[k];
  return out;
}

self.onmessage = function (e) {
  const { id, op, stage, seed, band } = e.data;
  const t0 = Date.now();
  /* Endless passes a band key (see generateFromBanded in mist-generate.js);
     everything else - the campaign, sectors, dev New level - leaves it
     unset and gets that stage's own ordinary range, exactly as before. */
  const build = () => band ? generateFromBanded(stage, seed >>> 0, band)
                            : generateFrom(stage, seed >>> 0);

  if (op === 'reveal') {
    let fires = null, error = null;
    try {
      const lvl = build();
      fires = lvl && lvl.solution;
    } catch (err) {
      error = String(err && err.stack || err);
    }
    self.postMessage({ id, fires, error, ms: Date.now() - t0 });
    return;
  }

  let level = null, error = null;
  try {
    level = withoutAnswer(build());
  } catch (err) {
    error = String(err && err.stack || err);
  }
  self.postMessage({ id, level, error, ms: Date.now() - t0 });
};
