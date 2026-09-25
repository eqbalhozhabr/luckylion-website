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

/* A raw testimony line that, on its own, already rules fire out of a given
   square - the one case worth searching for directly when the trace itself
   has no logged step for that exact square (see below). */
function findNoFireBesideClue(clues, mp, cell) {
  for (let i = 0; i < clues.length; i++) {
    const c = clues[i];
    if (c.kind === 'NO_FIRE_BESIDE' && mp.nb8[c.args[0]].includes(cell)) return i;
  }
  return -1;
}

self.onmessage = function (e) {
  const { id, op, stage, seed, band, hintIndex, fires } = e.data;
  const t0 = Date.now();
  /* Endless passes a band key (see generateFromBanded in mist-generate.js);
     everything else - the campaign, sectors, dev New level - leaves it
     unset and gets that stage's own ordinary range, exactly as before. */
  const build = () => band ? generateFromBanded(stage, seed >>> 0, band)
                            : generateFrom(stage, seed >>> 0);

  /* Hint replays the same deterministic solve and hands back one flattened
     step - never the trace itself, never anything past that single fact, so
     a hint tap can only ever advance one fact at a time.

     Before it does, it checks the fires the player has actually placed
     against the real solution (available here, never sent to the page):
     a fire sitting somewhere the solution doesn't is a live mistake, and
     pointing at it is worth more than another forward fact the player may
     already have worked out for themselves. Only once no such mistake is
     left does it fall back to the plain forward walk - which itself skips
     past any "light a fire here" step the player has already carried out,
     so a correctly-placed fire is never handed back as new information. */
  if (op === 'hint') {
    let hint = null, hintCount = 0, error = null;
    try {
      const lvl = build();
      const flat = lvl && flattenTrace(lvl.trace);
      hintCount = flat ? flat.length : 0;
      if (lvl && flat) {
        const placed = Array.isArray(fires) ? fires : [];
        const solutionSet = new Set(lvl.solution);
        const wrong = placed.filter(c => !solutionSet.has(c)).sort((a, b) => a - b);
        if (wrong.length) {
          const cell = wrong[0];
          let clueIdx = -1, move = null;
          for (const step of flat) {
            if (step.field === 'fire' && step.value === false && step.cell === cell) {
              clueIdx = step.clueIdx; move = step.move; break;
            }
          }
          if (clueIdx < 0) {
            const mp = makeMap(lvl.map.rows, lvl.zones);
            clueIdx = findNoFireBesideClue(lvl.clues, mp, cell);
          }
          hint = { kind: 'mistake', cell, move, clueIdx, field: 'fire', value: false };
        } else {
          const placedSet = new Set(placed);
          let idx = hintIndex;
          while (idx < flat.length && flat[idx].field === 'fire' &&
                 flat[idx].value === true && placedSet.has(flat[idx].cell)) {
            idx++;
          }
          const entry = flat[idx];
          hint = entry ? Object.assign({ kind: 'fact', index: idx }, entry) : null;
        }
      }
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
