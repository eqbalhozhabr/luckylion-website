/* Mist - solver and generator, ported from engine/mistgen.py.
 *
 * Runs in the browser (in a worker), so levels are generated on demand from a
 * seed instead of being baked into a file. That is what makes the supply
 * endless, and it means a level is identified by one number.
 */
'use strict';

/* ------------------------------------------------- enumerate legal levels */
/* Every placement whose mist obeys the thicket rule, grouped by the mist it
   produces. Only placements their mist *identifies* are usable: every clue is
   a statement about the mist, so if two placements share one, no testimony
   can ever tell them apart. Under this light model a quarter to a half of
   mist patterns are ambiguous, and those are discarded. */
function legalSolutions(mp, nfires) {
  const place = mp.placeable, np = place.length;
  const cov = place.map(c => bitsOf(coverOf(mp, c)));
  const [fogLo0, fogHi0] = bitsOf(mp.foggable);
  const zoneIds = Object.keys(mp.zoneCells).map(Number);
  const zoneBits = {};
  for (const z of zoneIds) zoneBits[z] = bitsOf(mp.zoneCells[z]);

  const groups = new Map();
  const pick = new Array(nfires);

  function walk(start, depth, litLo, litHi) {
    if (depth === nfires) {
      const fLo = (fogLo0 & ~litLo) >>> 0;
      const fHi = (fogHi0 & ~litHi) >>> 0;
      for (const z of zoneIds) {
        const [zl, zh] = zoneBits[z];
        if (pc32(fLo & zl) + pc32(fHi & zh) > ZONE_CAP) return;
      }
      const key = fLo + ':' + fHi;
      let g = groups.get(key);
      if (!g) { g = []; groups.set(key, g); }
      g.push(pick.slice());
      return;
    }
    const need = nfires - depth;
    for (let i = start; i <= np - need; i++) {
      pick[depth] = place[i];
      const [cl, ch] = cov[i];
      walk(i + 1, depth + 1, (litLo | cl) >>> 0, (litHi | ch) >>> 0);
    }
  }
  walk(0, 0, 0, 0);

  const every = [], identified = [];
  for (const g of groups.values()) {
    for (const s of g) every.push(s);
    if (g.length === 1) identified.push(g[0]);
  }
  return { every, identified, fogGroups: groups.size };
}

/* ------------------------------------------------------------- harvesting */
const TIERS = [
  new Set(['SAFE', 'FOGGED', 'NEAR_MONSTER', 'NO_MONSTER_NEAR',
           'FIRE_BESIDE', 'NO_FIRE_BESIDE']),
  new Set(['ZONE_FOG', 'ZONE_CLEAR', 'SCORCH']),
  new Set(['COUNT', 'EITHER']),
];
const tierOf = (kind) => {
  for (let t = 0; t < TIERS.length; t++) if (TIERS[t].has(kind)) return t;
  return 9;
};

function harvest(mp, fires, rng) {
  const F = new Set(fires);
  const fog = fogSet(mp, fires);
  const out = [];
  for (const key of Object.keys(mp.landmarks).map(Number).sort((a, b) => a - b)) {
    out.push({ kind: fog.has(key) ? 'FOGGED' : 'SAFE', args: [key] });
    out.push({ kind: mp.nb4[key].some(j => fog.has(j))
                 ? 'NEAR_MONSTER' : 'NO_MONSTER_NEAR', args: [key] });
    out.push({ kind: mp.nb8[key].some(j => F.has(j))
                 ? 'FIRE_BESIDE' : 'NO_FIRE_BESIDE', args: [key] });
  }
  for (const z of Object.keys(mp.zoneCells).map(Number).sort((a, b) => a - b)) {
    out.push({ kind: mp.zoneCells[z].some(i => fog.has(i))
                 ? 'ZONE_FOG' : 'ZONE_CLEAR', args: [z] });
  }
  for (const rock of mp.rocks) {
    out.push({ kind: 'SCORCH',
               args: [rock, mp.nb8[rock].filter(j => F.has(j)).length] });
  }
  out.push({ kind: 'COUNT', args: [fog.size] });

  // a witness who is not sure: one true statement or one false one
  const base = rngShuffle(rng, out.filter(c => c.kind === 'SAFE' || c.kind === 'FOGGED'));
  const lmKeys = Object.keys(mp.landmarks).map(Number);
  for (const c of base.slice(0, 3)) {
    const others = lmKeys.filter(i => i !== c.args[0]);
    if (!others.length) continue;
    const alt = { kind: c.kind === 'SAFE' ? 'FOGGED' : 'SAFE',
                  args: [rngPick(rng, others)] };
    if (!testClue(mp, alt, F, fog)) {
      out.push({ kind: 'EITHER', args: [c, alt] });
    }
  }
  const seen = new Set(), uniq = [];
  for (const c of out) {
    const sig = JSON.stringify(c);
    if (!seen.has(sig)) { seen.add(sig); uniq.push(c); }
  }
  return uniq;
}

/* --------------------------------------------------- deduction-only solver */
/* Only the moves a person makes. Anything this cannot solve is thrown away
   rather than shipped, because a unique answer that is reachable only by trial
   and error is not a puzzle. */
class Deduce {
  constructor(mp, clues, nfires) {
    this.mp = mp;
    this.clues = clues;
    this.n = nfires;
    this.sight = {};
    for (const c of mp.foggable) {
      const s = new Set();
      if (mp.grid[c] === '.') s.add(c);
      for (const j of mp.nb8[c]) if (mp.grid[j] === '.') s.add(j);
      this.sight[c] = s;
    }
    this.covers = {};
    for (const f of mp.placeable) {
      const s = new Set();
      for (const c of mp.foggable) if (this.sight[c].has(f)) s.add(c);
      this.covers[f] = s;
    }
    this.fire = new Map();  // cell -> true/false/undefined
    this.dark = new Map();  // cell -> true (mist) / false (lit) / undefined
    for (const f of mp.placeable) this.fire.set(f, undefined);
    for (const c of mp.foggable) this.dark.set(c, undefined);
    this.moves = [];
  }

  /* Return true only when something actually changed. Reporting "changed" for
     a value that was already set spins the propagation loop forever - that bug
     presented as a silent hang and cost a debugging round in Python. */
  setFire(c, v) {
    const cur = this.fire.get(c);
    if (cur === undefined) { this.fire.set(c, v); return true; }
    return cur === v ? false : 'bad';
  }
  setDark(c, v) {
    const cur = this.dark.get(c);
    if (cur === undefined) { this.dark.set(c, v); return true; }
    return cur === v ? false : 'bad';
  }

  propagate() {
    const mp = this.mp;
    let changed = false;
    for (;;) {
      let round = false;
      const bump = (r) => { if (r === 'bad') throw 'bad'; if (r) round = true; };

      try {
        // what the testimony states outright
        for (const cl of this.clues) {
          const a = cl.args;
          switch (cl.kind) {
            case 'SAFE': bump(this.setDark(a[0], false)); break;
            case 'FOGGED': bump(this.setDark(a[0], true)); break;
            case 'ZONE_CLEAR':
              for (const i of mp.zoneCells[a[0]]) bump(this.setDark(i, false));
              break;
            case 'NO_MONSTER_NEAR':
              for (const j of mp.nb4[a[0]]) {
                if (this.dark.has(j)) bump(this.setDark(j, false));
              }
              break;
            case 'NO_FIRE_BESIDE':
              for (const j of mp.nb8[a[0]]) {
                if (this.fire.has(j)) bump(this.setFire(j, false));
              }
              break;
          }
        }

        // a lit fire clears its whole reach
        for (const [f, v] of this.fire) {
          if (v === true) for (const c of this.covers[f]) bump(this.setDark(c, false));
        }
        // nothing can light it -> the mist stays
        for (const [c, v] of this.dark) {
          if (v !== undefined) continue;
          let any = false;
          for (const f of this.sight[c]) if (this.fire.get(f) !== false) { any = true; break; }
          if (!any) { this.dark.set(c, true); round = true; this.moves.push('FORCED_FOG'); }
        }
        // it must be lit -> where from?
        for (const [c, v] of this.dark) {
          if (v !== false) continue;
          const live = [...this.sight[c]].filter(f => this.fire.get(f) !== false);
          if (!live.length) throw 'bad';
          if (live.length === 1 && this.fire.get(live[0]) === undefined) {
            this.fire.set(live[0], true); round = true;
            this.moves.push('ONLY_SOURCE');
          }
        }
        // it is mist -> no fire may see it
        for (const [c, v] of this.dark) {
          if (v === true) for (const f of this.sight[c]) bump(this.setFire(f, false));
        }
        // the thicket rule
        for (const z of Object.keys(mp.zoneCells)) {
          const cells = mp.zoneCells[z];
          const fogged = cells.filter(i => this.dark.get(i) === true);
          if (fogged.length > ZONE_CAP) throw 'bad';
          if (fogged.length === ZONE_CAP) {
            for (const i of cells) {
              if (!fogged.includes(i)) bump(this.setDark(i, false));
            }
          }
        }
        // clues that need a last-one-standing argument
        for (const cl of this.clues) {
          const a = cl.args;
          if (cl.kind === 'FIRE_BESIDE') {
            const pool = mp.nb8[a[0]].filter(j => this.fire.has(j));
            const live = pool.filter(j => this.fire.get(j) !== false);
            if (!live.length) throw 'bad';
            if (live.length === 1 && this.fire.get(live[0]) === undefined) {
              this.fire.set(live[0], true); round = true;
              this.moves.push('LAST_STANDING');
            }
            continue;
          }
          let pool = null;
          if (cl.kind === 'ZONE_FOG') pool = mp.zoneCells[a[0]];
          else if (cl.kind === 'NEAR_MONSTER') {
            pool = mp.nb4[a[0]].filter(j => this.dark.has(j));
          }
          if (!pool) continue;
          if (pool.some(i => this.dark.get(i) === true)) continue;
          const live = pool.filter(i => this.dark.get(i) !== false);
          if (!live.length) throw 'bad';
          if (live.length === 1) {
            this.dark.set(live[0], true); round = true;
            this.moves.push('LAST_STANDING');
          }
        }
        // counting the fuel
        let yes = 0; const unk = [];
        for (const [c, v] of this.fire) {
          if (v === true) yes++; else if (v === undefined) unk.push(c);
        }
        if (yes > this.n || yes + unk.length < this.n) throw 'bad';
        if (yes === this.n && unk.length) {
          for (const c of unk) this.fire.set(c, false);
          round = true; this.moves.push('FUEL_SPENT');
        } else if (yes + unk.length === this.n && unk.length) {
          for (const c of unk) this.fire.set(c, true);
          round = true; this.moves.push('FUEL_FORCED');
        }
        // counting the monsters
        for (const cl of this.clues) {
          if (cl.kind !== 'COUNT') continue;
          const want = cl.args[0];
          let dy = 0; const du = [];
          for (const [c, v] of this.dark) {
            if (v === true) dy++; else if (v === undefined) du.push(c);
          }
          if (dy > want || dy + du.length < want) throw 'bad';
          if (dy === want && du.length) {
            for (const c of du) this.dark.set(c, false);
            round = true; this.moves.push('MONSTER_COUNT');
          } else if (dy + du.length === want && du.length) {
            for (const c of du) this.dark.set(c, true);
            round = true; this.moves.push('MONSTER_COUNT');
          }
        }
        // scorch marks
        for (const cl of this.clues) {
          if (cl.kind !== 'SCORCH') continue;
          const [rock, want] = cl.args;
          const pool = mp.nb8[rock].filter(j => this.fire.has(j));
          const y2 = pool.filter(j => this.fire.get(j) === true).length;
          const u2 = pool.filter(j => this.fire.get(j) === undefined);
          if (y2 > want || y2 + u2.length < want) throw 'bad';
          if (y2 === want && u2.length) {
            for (const j of u2) this.fire.set(j, false);
            round = true; this.moves.push('SCORCH');
          } else if (y2 + u2.length === want && u2.length) {
            for (const j of u2) this.fire.set(j, true);
            round = true; this.moves.push('SCORCH');
          }
        }
      } catch (e) {
        if (e === 'bad') return 'bad';
        throw e;
      }

      if (!round) {
        const r = this.disjointDemand();
        if (r === 'bad') return 'bad';
        if (!r) return changed;
      }
      changed = true;
    }
  }

  /* "The mill, the shrine and the well all stayed safe, and no single fire can
     reach two of them, so three of my four fires are already spoken for -
     nowhere else can have one." Adding this one technique took the generation
     yield from about 1-in-3 to 1-in-1. */
  disjointDemand() {
    const placed = [...this.fire].filter(([, v]) => v === true).map(([c]) => c);
    const left = this.n - placed.length;
    if (left <= 0) return false;
    const placedSet = new Set(placed);
    const need = [];
    for (const [c, v] of this.dark) {
      if (v !== false) continue;
      let covered = false;
      for (const f of this.sight[c]) if (placedSet.has(f)) { covered = true; break; }
      if (!covered) need.push(c);
    }
    if (!need.length) return false;
    const live = new Map();
    for (const c of need) {
      live.set(c, new Set([...this.sight[c]].filter(f => this.fire.get(f) !== false)));
    }
    need.sort((a, b) => live.get(a).size - live.get(b).size);
    const chosen = [], used = new Set();
    for (const c of need) {
      let clash = false;
      for (const f of live.get(c)) if (used.has(f)) { clash = true; break; }
      if (clash) continue;
      chosen.push(c);
      for (const f of live.get(c)) used.add(f);
    }
    if (chosen.length > left) return 'bad';
    if (chosen.length < left) return false;
    let changed = false;
    for (const [c, v] of this.fire) {
      if (v === undefined && !used.has(c)) { this.fire.set(c, false); changed = true; }
    }
    if (changed) this.moves.push('DISJOINT');
    return changed;
  }

  /* "If I light it there, nothing can reach the well." In a covering puzzle
     this is bread and butter, not an expert move - which is why difficulty is
     graded on how often it is needed. */
  forward() {
    let changed = false;
    const undecided = [...this.fire].filter(([, v]) => v === undefined).map(([c]) => c);
    for (const c of undecided) {
      if (this.fire.get(c) !== undefined) continue;
      for (const guess of [true, false]) {
        const snapF = new Map(this.fire), snapD = new Map(this.dark);
        this.fire.set(c, guess);
        const bad = this.propagate() === 'bad';
        this.fire = snapF; this.dark = snapD;
        if (bad) {
          this.fire.set(c, !guess);
          changed = true;
          this.moves.push('FORWARD');
          if (this.propagate() === 'bad') return 'bad';
          break;
        }
      }
    }
    return changed;
  }

  solve() {
    let rounds = 0;
    for (;;) {
      rounds++;
      if (rounds > 40) return { fires: null, rounds, moves: this.moves };
      if (this.propagate() === 'bad') return { fires: null, rounds, moves: this.moves };
      let allSet = true;
      for (const [, v] of this.fire) if (v === undefined) { allSet = false; break; }
      if (allSet) {
        const got = [...this.fire].filter(([, v]) => v === true).map(([c]) => c);
        return { fires: got.length === this.n ? got.sort((a, b) => a - b) : null,
                 rounds, moves: this.moves };
      }
      const r = this.forward();
      if (r === 'bad' || !r) return { fires: null, rounds, moves: this.moves };
    }
  }
}

/* ------------------------------------------------------- building a brief */
/* The legal space is small enough to enumerate, so a candidate clue is a mask
   over that list and minimising is exact set arithmetic rather than repeated
   searches. */
function buildBrief(mp, sols, target, cands, nfires) {
  const key = (s) => s.join(',');
  const tkey = key(target);
  const ti = sols.findIndex(s => key(s) === tkey);
  if (ti < 0) return null;

  const fogs = sols.map(s => fogSet(mp, s));
  const sets = sols.map(s => new Set(s));
  const masks = cands.map(c => {
    const m = new Set();
    for (let i = 0; i < sols.length; i++) {
      if (testClue(mp, c, sets[i], fogs[i])) m.add(i);
    }
    return m;
  });
  const usable = [];
  for (let n = 0; n < cands.length; n++) if (masks[n].has(ti)) usable.push(n);

  const solvable = (idxs) => {
    const got = new Deduce(mp, idxs.map(n => cands[n]), nfires).solve().fires;
    return got && key(got) === tkey;
  };

  let alive = new Set(sols.map((_, i) => i));
  const chosen = [];
  while (alive.size > 1) {
    let best = null, bestKey = null;
    for (const n of usable) {
      if (chosen.includes(n)) continue;
      let cut = 0;
      for (const i of alive) if (masks[n].has(i)) cut++;
      if (cut === alive.size) continue;
      const k = [tierOf(cands[n].kind), cut];
      if (!bestKey || k[0] < bestKey[0] || (k[0] === bestKey[0] && k[1] < bestKey[1])) {
        best = n; bestKey = k;
      }
    }
    if (best === null) return null;
    chosen.push(best);
    const next = new Set();
    for (const i of alive) if (masks[best].has(i)) next.add(i);
    alive = next;
  }

  // a minimal brief is the hardest brief, so only shorten it while the puzzle
  // still falls to pure deduction
  if (!solvable(chosen)) {
    const extra = usable.slice()
      .sort((a, b) => tierOf(cands[a].kind) - tierOf(cands[b].kind)
                      || masks[a].size - masks[b].size);
    let done = false;
    for (const n of extra) {
      if (chosen.includes(n)) continue;
      chosen.push(n);
      if (solvable(chosen)) { done = true; break; }
    }
    if (!done) return null;
  }
  const order = chosen.slice().sort((a, b) => tierOf(cands[b].kind) - tierOf(cands[a].kind));
  let keep = chosen.slice();
  for (const n of order) {
    const trial = keep.filter(x => x !== n);
    if (!trial.length) continue;
    let surv = new Set(sols.map((_, i) => i));
    for (const x of trial) {
      const nxt = new Set();
      for (const i of surv) if (masks[x].has(i)) nxt.add(i);
      surv = nxt;
    }
    if (surv.size === 1 && solvable(trial)) keep = trial;
  }
  return keep.map(n => cands[n]);
}

/* ------------------------------------------------------------- difficulty */
/* Graded on how much forward-checking is demanded, with thresholds read off
   the measured distribution (0-24 applications, median 12). Two earlier
   attempts - a weighted sum, then "the hardest technique required" - both put
   every puzzle in hard/expert. */
function grade(clues, rounds, moves) {
  const fw = moves.filter(m => m === 'FORWARD').length;
  const score = fw + rounds * 1.5 - clues.length * 0.4;
  let name = 'expert';
  if (fw <= 2) name = 'easy';
  else if (fw <= 8) name = 'medium';
  else if (fw <= 16) name = 'hard';
  return { difficulty: name, score: Math.round(score * 10) / 10, forward: fw };
}

/* ------------------------------------------------------------- the ladder */
const LANDMARK_KINDS = new Set(['SAFE', 'FOGGED', 'NEAR_MONSTER',
  'NO_MONSTER_NEAR', 'FIRE_BESIDE', 'NO_FIRE_BESIDE']);
const THICKET_KINDS = new Set(['ZONE_FOG', 'ZONE_CLEAR']);
const MARK_KINDS = new Set(['SCORCH', 'COUNT']);
const union = (...ss) => new Set(ss.flatMap(s => [...s]));

/* A stage caps difficulty as well as introducing clue families. Without the
   cap the early stages happily served "hard" levels, because the clue
   vocabulary and the map size do not by themselves control how much deduction
   a level demands. minClues stops the generator shipping a one-line brief,
   which is technically unique but no fun to solve. */
const DIFF_RANK = { easy: 1, medium: 2, hard: 3, expert: 4 };

const LADDER = [
  /* Four landmarks rather than three at stage 1: they are the clue anchors,
     so more of them makes the tutorial more legible, and it triples the pool
     the padding can draw on - with three the padding ran dry and half the
     seeds could not produce an easy level at all. */
  { stage: 1, w: 5, h: 5, nfires: 3, zones: 4, rocks: 1,
    landmarks: ['C', 'M', 'W', 'S'],
    allow: LANDMARK_KINDS, span: [20, 1500],
    maxDiff: 'easy', minClues: 3, pad: 3, minMonsters: 2, maxClues: 12 },
  { stage: 2, w: 5, h: 5, nfires: 3, zones: 4, rocks: 2,
    landmarks: ['C', 'M', 'W', 'S'],
    allow: union(LANDMARK_KINDS, THICKET_KINDS), span: [20, 1500],
    maxDiff: 'medium', minClues: 3, pad: 1, minMonsters: 2 },
  { stage: 3, w: 6, h: 6, nfires: 4, zones: 6, rocks: 2,
    landmarks: ['C', 'M', 'G', 'S', 'W'],
    allow: union(LANDMARK_KINDS, THICKET_KINDS, MARK_KINDS), span: [60, 4000],
    maxDiff: 'hard', minDiff: 'medium', minClues: 4, minMonsters: 3 },
  { stage: 4, w: 6, h: 6, nfires: 4, zones: 6, rocks: 2,
    landmarks: ['C', 'M', 'G', 'S', 'W'],
    allow: union(LANDMARK_KINDS, THICKET_KINDS, MARK_KINDS, new Set(['EITHER'])),
    span: [60, 4000],
    maxDiff: 'expert', minDiff: 'hard', minClues: 4, minMonsters: 3 },
];

/* Generate one level. Deterministic in (stage, seed): the same pair always
   rebuilds the same level, which is what a daily puzzle and a share code need.
   Returns null only if the seed is unlucky enough to exhaust its attempts. */
function generateLevel(stage, seed, maxAttempts) {
  const cfg = LADDER.find(c => c.stage === stage) || LADDER[LADDER.length - 1];
  const rng = mulberry32(seed);
  const tries = maxAttempts || 80;
  for (let attempt = 0; attempt < tries; attempt++) {
    const rows = randomMap(rng, cfg.w, cfg.h, cfg.rocks, cfg.landmarks);
    if (!rows) continue;
    const zones = genZones(rows, cfg.w, cfg.h, cfg.zones, rng);
    if (!zones) continue;
    const mp = makeMap(rows, zones);
    if (mp.placeable.length < cfg.nfires + 4) continue;
    const { every, identified } = legalSolutions(mp, cfg.nfires);
    if (every.length < cfg.span[0] || every.length > cfg.span[1]) continue;
    if (!identified.length) continue;
    const target = rngPick(rng, identified).slice().sort((a, b) => a - b);
    const cands = harvest(mp, target, rng).filter(c => cfg.allow.has(c.kind));
    if (!cands.length) continue;
    let clues = buildBrief(mp, every.map(s => s.slice().sort((a, b) => a - b)),
                           target, cands, cfg.nfires);
    if (!clues || clues.length < (cfg.minClues || 1)) continue;
    /* Minimising a brief maximises its difficulty - strip a puzzle to the
       bone and only guesswork is left. So rather than throwing a level away
       for being too hard for its stage, pad the brief with more true
       statements until it comes down to the cap. More information can only
       make a puzzle easier, and this turns most rejections into levels. */
    const have = new Set(clues.map(c => JSON.stringify(c)));
    const spare = rngShuffle(rng, cands.filter(
      c => tierOf(c.kind) === 0 && !have.has(JSON.stringify(c))));
    for (let i = 0; i < (cfg.pad || 0) && spare.length; i++) clues.push(spare.shift());

    let res = new Deduce(mp, clues, cfg.nfires).solve();
    if (!res.fires || res.fires.join(',') !== target.join(',')) continue;
    let g = grade(clues, res.rounds, res.moves);
    const capRank = DIFF_RANK[cfg.maxDiff || 'expert'];
    const maxClues = cfg.maxClues || 10;
    while (DIFF_RANK[g.difficulty] > capRank && spare.length
           && clues.length < maxClues) {
      clues.push(spare.shift());
      const r2 = new Deduce(mp, clues, cfg.nfires).solve();
      if (!r2.fires || r2.fires.join(',') !== target.join(',')) break;
      res = r2;
      g = grade(clues, res.rounds, res.moves);
    }
    if (DIFF_RANK[g.difficulty] > capRank) continue;
    // a floor as well as a cap, so the ladder actually climbs: stage 4 serving
    // an easy level is as wrong as stage 1 serving a hard one
    if (DIFF_RANK[g.difficulty] < DIFF_RANK[cfg.minDiff || 'easy']) continue;
    const fog = [...fogSet(mp, target)].sort((a, b) => a - b);
    // "you lit the fires and nothing happened" is not a level
    if (fog.length < (cfg.minMonsters || 1)) continue;
    return {
      stage: cfg.stage,
      stageName: T().stage[cfg.stage],
      seed,
      map: { w: cfg.w, h: cfg.h, rows },
      zones,
      landmarks: mp.landmarks,
      nfires: cfg.nfires,
      clues,
      solution: target,
      monsters: fog,
      legal: every.length,
      difficulty: g.difficulty,
      score: g.score,
      rounds: res.rounds,
      forward: g.forward,
      attempts: attempt + 1,
    };
  }
  return null;
}

/* The caller should never have to handle a failure: an unlucky seed just
   rolls forward to the next one. The level still reports the seed it was
   actually built from, so it stays reproducible and shareable. */
function generateFrom(stage, seed, maxSeeds) {
  for (let k = 0; k < (maxSeeds || 30); k++) {
    const lvl = generateLevel(stage, (seed + k) >>> 0);
    if (lvl) return lvl;
  }
  return null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { legalSolutions, harvest, Deduce, buildBrief, grade,
                     generateLevel, generateFrom, LADDER, tierOf };
}
