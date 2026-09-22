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
 * its own. Only Hint wants a piece of the answer, and it asks for one fact
 * at a time.
 *
 * Generation is deterministic in the seed, so answering that request costs one
 * rebuild rather than a stored answer sitting in the page's memory.
 */
'use strict';
importScripts('mist-engine.js', 'mist-generate.js');

/* The fields that give the game away. `monsters` is the fog set of the
   winning arrangement, which the page recomputes from the fires it is showing
   anyway, so nothing is lost by withholding it. `trace` is the solver's own
   step-by-step working - keeping it out of an ordinary level request is what
   makes Hint mean anything: one step at a time, asked for and paid for, never
   sitting in the page's memory for anyone to read in full. */
function withoutAnswer(level) {
  if (!level) return level;
  const out = {};
  for (const k in level) if (k !== 'solution' && k !== 'monsters' && k !== 'trace') out[k] = level[k];
  return out;
}

/* One trace entry can resolve several cells at once (the fuel count running
   out settles every remaining candidate together, say) - flattened to one
   cell per hint so a single Hint tap never hands over more than one new
   fact, regardless of how the solver itself bundled the step. */
function flattenTrace(trace) {
  const out = [];
  for (const t of trace) {
    for (const cell of t.cells) {
      out.push({ cell, field: t.field, value: t.value, move: t.move, clueIdx: t.clueIdx });
    }
  }
  return out;
}

self.onmessage = function (e) {
  const { id, op, stage, seed, band, hintIndex } = e.data;
  const t0 = Date.now();
  /* Endless passes a band key (see generateFromBanded in mist-generate.js);
     everything else - the campaign, sectors, dev New level - leaves it
     unset and gets that stage's own ordinary range, exactly as before. */
  const build = () => band ? generateFromBanded(stage, seed >>> 0, band)
                            : generateFrom(stage, seed >>> 0);

  /* Hint replays the same deterministic solve and hands back one flattened
     step at hintIndex - never the trace itself, never anything past that
     single index, so a hint tap can only ever advance one fact at a time. */
  if (op === 'hint') {
    let hint = null, hintCount = 0, error = null;
    try {
      const lvl = build();
      const flat = lvl && flattenTrace(lvl.trace);
      hintCount = flat ? flat.length : 0;
      hint = flat ? (flat[hintIndex] || null) : null;
    } catch (err) {
      error = String(err && err.stack || err);
    }
    self.postMessage({ id, hint, hintCount, error, ms: Date.now() - t0 });
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
