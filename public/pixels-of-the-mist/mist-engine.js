/* Mist - core engine.
 *
 * Plain script, no modules: the page loads it with <script src> and the
 * generation worker loads the same file with importScripts, so there is one
 * implementation of the rules and no build step to host it.
 *
 * Ported from engine/mist.py and engine/mistgen.py. The Python side stays as
 * the reference implementation and the analysis tooling.
 */
'use strict';

/* ------------------------------------------------------------------ rng */
/* Seeded, so a level is identified by a single number: the same seed always
   rebuilds the same level. That is what makes a daily puzzle and a share code
   possible without a server. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function rngInt(rng, n) { return Math.floor(rng() * n); }
function rngPick(rng, arr) { return arr[rngInt(rng, arr.length)]; }
function rngShuffle(rng, arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rngInt(rng, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* --------------------------------------------------------------- strings */
/* Player-facing text is a lookup rather than hardcoded, because the project
   has already had to switch language once. */
const STRINGS = {
  en: {
    landmark: { C: 'Shelter', M: 'Workshop', G: 'Depot', S: 'Memorial',
                W: 'Pump' },
    zone: ['Scrapfield', 'Sludge', 'Rubble', 'Ashfield', 'Dead Grove',
           'Crater'],
    stage: ['', 'First Night', 'The Sectors', 'Signs', 'Doubtful Witness'],
    difficulty: { easy: 'Easy', medium: 'Medium', hard: 'Hard',
                  expert: 'Expert' },
    clue: {
      SAFE: (n) => `The ${n} was safe until dawn.`,
      FOGGED: (n) => `The ${n} was lost in the mist — something was there.`,
      NEAR_MONSTER: (n) => `A monster was seen right near the ${n}.`,
      NO_MONSTER_NEAR: (n) => `Nothing came near the ${n} all night.`,
      FIRE_BESIDE: (n) => `A fire was burning around the ${n}.`,
      NO_FIRE_BESIDE: (n) => `No fire burned anywhere around the ${n}.`,
      ZONE_FOG: (n) => `There was a monster in the ${n}.`,
      ZONE_CLEAR: (n) => `The ${n} stayed clear until dawn.`,
      COUNT: (k) => `Exactly ${k} monsters were counted that night.`,
      EITHER: (a, b) => `Either ${a} or ${b} — I cannot remember which.`,
    },
    ui: {
      title: 'TLS: Pixels of the Mist',
      rule1: (n) => `You have fuel for <b>${n}</b> fires. Light each one on open ground.`,
      rule2: 'A fire pushes the mist off its own square and the <b>eight around it</b>.',
      rule3: 'Wherever the light never reaches, the mist stays — and a monster with it.',
      rule4: 'A sector can hide at most <b>two</b> monsters.',
      rule5: 'A number on a rock is how many fires are touching it.',
      fuel: 'Fuel',
      testimony: 'Survivor testimony',
      submit: 'Submit',
      reset: 'Clear',
      reveal: 'Hint',
      newLevel: 'New level',
      hintFireHere: 'A hint: light a fire right there.',
      hintNoFireHere: 'A hint: no fire goes there — you can rule it out.',
      hintStaysDark: 'A hint: that square stays in the mist. A monster is out there.',
      hintClearsSafe: 'A hint: that square is safe ground. No monster there.',
      hintNone: 'No hints left. Solve a few more levels to earn one.',
      hintExhausted: 'No more hints for this one — you already have everything the survivors can tell you.',
      hintTap: 'Tap a square to <b>preview</b> a fire. Hold or double-tap to <b>light</b> it. Tap a lit fire to take it back.',
      hintPreview: 'Previews are free — hold as many as you like while you think.',
      remaining: (n) => `${n} more fire${n === 1 ? '' : 's'} to place.`,
      ready: 'Ready to submit.',
      overloaded: (names) => names.length === 1
        ? `More than two monsters have gathered in the ${names[0]}.`
        : `More than two monsters have gathered in ${names.length} sectors.`,
      wrong: 'This does not match what the survivors saw.',
      win: 'It all fits. The shelter held until dawn.',
      resultWinTitle: 'Dawn',
      resultWinBody: 'It all fits. The shelter held until dawn.',
      resultLoseTitle: 'Overrun',
      resultLoseBody: 'Three wrong guesses, and the mist took the shelter.',
      resultNext: 'Next Level',
      resultRetry: 'Retry',
      resultMenu: 'Menu',
      chapterMapTitle: 'Chapter Map',
      chapterMapHint: 'Each sector reshuffles into a fresh puzzle every time you enter it.',
      lockDev: (name) => `${name} is still being written — check back soon.`,
      lockComplete: (name) => `Complete ${name} to unlock this chapter.`,
      lockPurchase: (name) => `${name} is a one-time purchase — buy it to unlock.`,
      levelOf: (n, total) => `Level ${n} of ${total}`,
      dailyAgain: 'Today’s challenge is done. Come back tomorrow for a new one.',
      endlessLabel: 'Endless Mode',
      endlessLevel: (n) => `Level ${n}`,
      dailyLabel: 'Daily Challenge',
      dailyStreak: (n) => n === 1 ? '1 day streak' : `${n} day streak`,
      tutorialStepOf: (n, total) => `Step ${n} of ${total}`,
      legend: { fire: 'fire', monster: 'monster',
                border: 'each colour is a sector', rock: 'rubble, impassable' },
      stageLabel: (n, name) => `Stage ${n} — ${name}`,
      seed: 'Seed',
      menuStart: 'Start',
      menuContinue: 'Continue',
      solvedLabel: (n, total) => `Solved · ${n}/${total}`,
      chapterMap: 'Chapter Map',
      endless: 'Endless',
      daily: 'Daily',
      today: 'Today',
      howToPlay: 'How to Play',
      selectChapter: 'Select Chapter',
      playTutorial: 'Play Tutorial',
      htpRule1: 'Tap a square to preview a fire.',
      htpRule2: 'Hold or double-tap to light it — this spends fuel.',
      htpRule3: 'A lit fire clears the mist around it.',
      htpRule4: 'Survivor testimony tells you where not to look.',
      htpRule5: 'Tap a lit fire to take it back — nothing is final until Submit.',
      htpRule6: 'Three wrong submissions reset the level. No timers, no penalty beyond that.',
      setupTitle: 'Setup',
      reduceFlicker: 'Reduce flicker',
      music: 'Music',
      sfx: 'SFX',
      ambience: 'Ambience',
      soon: 'Soon',
      language: 'Language',
      rulesTitle: 'Rules',
      reportSlideLabel: 'Report',
      storySlideLabel: 'Story',
      setupSlideLabel: 'Setup',
      backLabel: 'Back',
      storyLine1: 'The coast is covered in fog. Monsters hide inside it.',
      storyLine2: 'Fire is the only safety. Light drives the fog back.',
      storyLine3: 'You were not there that night — only the survivors were.',
      storyLine4: 'Read what they saw. Find where the fires burned.',
      generatorError: 'The generator could not build a level.',
      tutorialNext: 'Next',
      tutorialFinish: 'Finish',
      hintGotIt: 'Got it',
      legendBlack: (rock) => `black — ${rock}`,
      chapterFallback: (n) => `Chapter ${n}`,
      tutorialCaption1: 'Tap a square to <b>preview</b> a fire. It costs nothing — hold as many as you like while you think.',
      tutorialCaption2: 'Now hold it down — or double-tap — to actually <b>light</b> it. Watch the mist pull back.',
      tutorialCaption3: 'Changed your mind? Tap a lit fire to take it back, then light it again.',
      tutorialCaption4: 'Two lines of testimony, one square to place. Read both, then light the one that fits.',
      tutorialCaption5: '<b>Near</b> means the four squares that touch a place — up, down, left, right. The highlighted squares are what this line means; light two fires so one of them stays dark.',
      tutorialCaption6: 'Its opposite: this time light both fires so <b>all four</b> highlighted squares clear.',
      tutorialCaption7: '<b>Around</b> is wider — all eight squares touching a place, corners included. Light the one fire somewhere inside the highlight.',
      tutorialCaption8: 'And its opposite: light the fire <b>outside</b> the highlighted eight.',
      tutorialCaption9: 'One more — but this time press <b>Submit</b> when you’re happy. Stuck? <b>Hint</b> is always there, and three wrong guesses just reset the level.',
      emailPlaceholder: 'you@example.com',
      sendLink: 'Send link',
      signInPrompt: 'Sign in to keep purchases and progress on any device.',
      sending: 'Sending…',
      checkEmail: 'Check your email for a sign-in link.',
      sendFailed: 'Could not send the link. Try again in a moment.',
      signedInAsUsername: (name) => `Signed in as <b>${name}</b>`,
      signedInAsEmail: (email) => `Signed in as <b>${email}</b>`,
      usernamePlaceholder: 'pick a username',
      saveLabel: 'Save',
      usernameTaken: 'That username is taken.',
      usernameRules: 'Letters, numbers, underscore, 3-20 characters.',
      signOut: 'Sign out',
    },
  },
  fa: {
    landmark: { C: 'پناهگاه', M: 'کارگاه', G: 'انبار', S: 'یادبود',
                W: 'پمپ' },
    zone: ['کوره‌آهن', 'لجن‌زار', 'خرابه', 'خاکستر', 'بیشه‌ی‌مرده',
           'گودال'],
    stage: ['', 'شب نخست', 'سکتورها', 'نشانه‌ها', 'شاهد مشکوک'],
    difficulty: { easy: 'آسان', medium: 'متوسط', hard: 'سخت',
                  expert: 'خبره' },
    clue: {
      SAFE: (n) => `${n} تا سپیده‌دم امن بود.`,
      FOGGED: (n) => `${n} توی مه گم شد — چیزی اونجا بود.`,
      NEAR_MONSTER: (n) => `یه هیولا درست نزدیک ${n} دیده شد.`,
      NO_MONSTER_NEAR: (n) => `کل شب چیزی نزدیک ${n} نیومد.`,
      FIRE_BESIDE: (n) => `یه آتیش دور و بر ${n} می‌سوخت.`,
      NO_FIRE_BESIDE: (n) => `هیچ آتیشی دور و بر ${n} نبود.`,
      ZONE_FOG: (n) => `توی ${n} یه هیولا بود.`,
      ZONE_CLEAR: (n) => `${n} تا سپیده‌دم پاک موند.`,
      COUNT: (k) => `دقیقاً ${k} هیولا اون شب شمرده شد.`,
      EITHER: (a, b) => `یا ${a} یا ${b} — یادم نیست کدوم.`,
    },
    ui: {
      title: 'TLS: Pixels of the Mist',
      rule1: (n) => `سوخت برای <b>${n}</b> آتیش داری. هرکدوم رو روی زمین باز روشن کن.`,
      rule2: 'یه آتیش مه رو از خونه‌ی خودش و <b>هشت‌تای اطرافش</b> کنار می‌زنه.',
      rule3: 'هرجا نور نرسه، مه می‌مونه — و یه هیولا هم باهاش.',
      rule4: 'یه سکتور حداکثر <b>دو</b> هیولا می‌تونه پنهان کنه.',
      rule5: 'عددی که روی یه تخته‌سنگه، یعنی چندتا آتیش بهش چسبیده.',
      fuel: 'سوخت',
      testimony: 'شهادت بازمانده',
      submit: 'ثبت',
      reset: 'پاک کردن',
      reveal: 'راهنما',
      newLevel: 'مرحله‌ی جدید',
      hintFireHere: 'راهنما: دقیقاً همین‌جا یه آتیش روشن کن.',
      hintNoFireHere: 'راهنما: اینجا آتیشی نیست — می‌تونی حذفش کنی.',
      hintStaysDark: 'راهنما: این خونه توی مه می‌مونه. یه هیولا اون بیرونه.',
      hintClearsSafe: 'راهنما: این خونه امنه. هیولایی اونجا نیست.',
      hintNone: 'راهنمایی نمونده. چندتا مرحله‌ی دیگه حل کن تا یکی به‌دست بیاری.',
      hintExhausted: 'راهنمای بیشتری برای این یکی نیست — همه‌چیزی که بازمانده‌ها می‌تونن بگن رو داری.',
      hintTap: 'روی یه خونه ضربه بزن تا آتیش رو <b>پیش‌نمایش</b> کنی. نگه‌دار یا دوبار ضربه بزن تا <b>روشنش</b> کنی. روی آتیش روشن بزن تا برش‌داری.',
      hintPreview: 'پیش‌نمایش‌ها رایگانن — هرچقدر خواستی نگه‌شون دار تا فکر کنی.',
      remaining: (n) => `${n} آتیش دیگه مونده که بذاری.`,
      ready: 'آماده‌ی ثبته.',
      overloaded: (names) => names.length === 1
        ? `بیشتر از دو هیولا توی ${names[0]} جمع شدن.`
        : `بیشتر از دو هیولا توی ${names.length} سکتور جمع شدن.`,
      wrong: 'با چیزی که بازمانده‌ها دیدن جور در نمیاد.',
      win: 'همه‌چیز جور دراومد. پناهگاه تا سپیده‌دم دووم آورد.',
      resultWinTitle: 'سپیده‌دم',
      resultWinBody: 'همه‌چیز جور دراومد. پناهگاه تا سپیده‌دم دووم آورد.',
      resultLoseTitle: 'سقوط',
      resultLoseBody: 'سه حدس اشتباه، و مه پناهگاه رو گرفت.',
      resultNext: 'مرحله‌ی بعد',
      resultRetry: 'تلاش دوباره',
      resultMenu: 'منو',
      chapterMapTitle: 'نقشه فصل‌ها',
      chapterMapHint: 'هر سکتور هر بار که واردش بشی، به یه پازل تازه به‌هم می‌ریزه.',
      lockDev: (name) => `${name} هنوز داره نوشته می‌شه — بعداً سر بزن.`,
      lockComplete: (name) => `${name} رو تموم کن تا این فصل باز بشه.`,
      lockPurchase: (name) => `${name} یه خرید یک‌باره‌ست — بخرش تا باز بشه.`,
      levelOf: (n, total) => `مرحله ${n} از ${total}`,
      dailyAgain: 'چلنج امروز تموم شد. فردا بیا سراغ یکی جدید.',
      endlessLabel: 'حالت بی‌پایان',
      endlessLevel: (n) => `مرحله ${n}`,
      dailyLabel: 'چلنج روزانه',
      dailyStreak: (n) => n === 1 ? '۱ روز پیاپی' : `${n} روز پیاپی`,
      tutorialStepOf: (n, total) => `قدم ${n} از ${total}`,
      legend: { fire: 'آتیش', monster: 'هیولا',
                border: 'هر رنگ یه سکتوره', rock: 'خرابه، غیرقابل‌عبور' },
      stageLabel: (n, name) => `فصل ${n} — ${name}`,
      seed: 'سید',
      menuStart: 'شروع',
      menuContinue: 'ادامه',
      solvedLabel: (n, total) => `حل‌شده · ${n}/${total}`,
      chapterMap: 'نقشه فصل‌ها',
      endless: 'بی‌پایان',
      daily: 'روزانه',
      today: 'امروز',
      howToPlay: 'چطور بازی کنیم',
      selectChapter: 'انتخاب فصل',
      playTutorial: 'آموزش بازی',
      htpRule1: 'برای پیش‌نمایش یه آتیش، روی خونه ضربه بزن.',
      htpRule2: 'برای روشن کردنش نگه‌دار یا دوبار ضربه بزن — سوخت مصرف می‌کنه.',
      htpRule3: 'هر آتیش روشن، مه اطرافش رو کنار می‌زنه.',
      htpRule4: 'شهادت بازمانده‌ها می‌گه کجا رو نگاه نکنی.',
      htpRule5: 'برای برداشتن یه آتیش روشن، دوباره روش ضربه بزن — تا Submit نزنی چیزی قطعی نیست.',
      htpRule6: 'سه حدس اشتباه، مرحله رو از نو شروع می‌کنه. بدون تایمر، بدون جریمه‌ی بیشتر.',
      setupTitle: 'تنظیمات',
      reduceFlicker: 'کاهش سوسوزدن',
      music: 'موسیقی',
      sfx: 'جلوه‌های صوتی',
      ambience: 'صدای محیط',
      soon: 'به‌زودی',
      language: 'زبان',
      rulesTitle: 'قوانین',
      reportSlideLabel: 'گزارش',
      storySlideLabel: 'داستان',
      setupSlideLabel: 'تنظیمات',
      backLabel: 'برگشت',
      storyLine1: 'ساحل زیر مه فرو رفته. هیولاها داخلش پنهانن.',
      storyLine2: 'آتیش تنها راه امنیته. نور، مه رو عقب می‌رونه.',
      storyLine3: 'تو اون شب اونجا نبودی — فقط بازمانده‌ها بودن.',
      storyLine4: 'چیزی که دیدن رو بخون. پیدا کن آتیش‌ها کجا روشن شده بودن.',
      generatorError: 'تولیدکننده نتونست یه مرحله بسازه.',
      tutorialNext: 'بعدی',
      tutorialFinish: 'پایان',
      hintGotIt: 'فهمیدم',
      legendBlack: (rock) => `مشکی — ${rock}`,
      chapterFallback: (n) => `فصل ${n}`,
      tutorialCaption1: 'روی یه خونه ضربه بزن تا آتیش رو <b>پیش‌نمایش</b> کنی. هیچ هزینه‌ای نداره — هرچقدر خواستی نگه‌ش دار تا فکر کنی.',
      tutorialCaption2: 'حالا نگه‌ش دار — یا دوبار ضربه بزن — تا واقعاً <b>روشنش</b> کنی. ببین مه چطور عقب می‌ره.',
      tutorialCaption3: 'نظرت عوض شد؟ روی آتیش روشن ضربه بزن تا برش‌داری، بعد دوباره روشنش کن.',
      tutorialCaption4: 'دو خط شهادت، یه خونه برای گذاشتن. هر دو رو بخون، بعد اونی که جور در میاد رو روشن کن.',
      tutorialCaption5: '<b>نزدیک</b> یعنی چهار خونه‌ای که به یه جا چسبیده‌ن — بالا، پایین، چپ، راست. خونه‌های هایلایت‌شده معنی این خطن؛ دو تا آتیش روشن کن طوری که یکیشون تاریک بمونه.',
      tutorialCaption6: 'برعکسش: این‌بار هر دو آتیش رو روشن کن طوری که <b>هر چهار</b> خونه‌ی هایلایت‌شده پاک بشه.',
      tutorialCaption7: '<b>اطراف</b> گسترده‌تره — هر هشت خونه‌ای که به یه جا چسبیده‌ن، گوشه‌ها هم حساب می‌شن. یه آتیش رو یه‌جایی داخل هایلایت روشن کن.',
      tutorialCaption8: 'و برعکسش: آتیش رو <b>بیرون</b> از اون هشت‌تای هایلایت‌شده روشن کن.',
      tutorialCaption9: 'یکی دیگه — ولی این‌بار وقتی مطمئن شدی، <b>Submit</b> رو بزن. گیر کردی؟ <b>Hint</b> همیشه هست، و سه حدس اشتباه فقط مرحله رو از نو شروع می‌کنه.',
      emailPlaceholder: 'ایمیلت رو بنویس',
      sendLink: 'ارسال لینک',
      signInPrompt: 'برای حفظ خریدها و پیشرفتت روی هر دستگاهی، وارد شو.',
      sending: 'در حال ارسال…',
      checkEmail: 'ایمیلت رو برای لینک ورود چک کن.',
      sendFailed: 'لینک ارسال نشد. یه لحظه دیگه دوباره امتحان کن.',
      signedInAsUsername: (name) => `وارد شدی به‌عنوان <b>${name}</b>`,
      signedInAsEmail: (email) => `وارد شدی با <b>${email}</b>`,
      usernamePlaceholder: 'یه یوزرنیم انتخاب کن',
      saveLabel: 'ذخیره',
      usernameTaken: 'این یوزرنیم قبلاً گرفته شده.',
      usernameRules: 'حروف، عدد، زیرخط، بین ۳ تا ۲۰ کاراکتر.',
      signOut: 'خروج',
    },
  },
};
let LANG = 'en';
const T = () => STRINGS[LANG];
/* fa/ar read right-to-left and have no Press-Start-2P glyphs of their own -
   flagged here once so both the font fallback (CSS) and the text-direction
   attribute (below) key off the same single list. */
const RTL_LANGS = new Set(['fa', 'ar']);

/* ------------------------------------------------------------------ map */
const NB8 = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const NB4 = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const LANDMARK_CHARS = 'CMGSW';

function makeMap(rows, zones) {
  const h = rows.length, w = rows[0].length, n = w * h;
  const grid = rows.join('');
  const mp = { rows, w, h, n, grid, zones };
  mp.open = []; mp.rocks = []; mp.landmarks = {};
  for (let i = 0; i < n; i++) {
    const ch = grid[i];
    if (ch === '.') mp.open.push(i);
    else if (ch === '#') mp.rocks.push(i);
    else if (LANDMARK_CHARS.includes(ch)) mp.landmarks[i] = ch;
  }
  mp.placeable = mp.open.slice();
  mp.foggable = mp.open.concat(Object.keys(mp.landmarks).map(Number))
                       .sort((a, b) => a - b);
  mp.isFoggable = new Uint8Array(n);
  mp.foggable.forEach(i => { mp.isFoggable[i] = 1; });

  mp.nb8 = []; mp.nb4 = [];
  for (let i = 0; i < n; i++) {
    const r = (i / w) | 0, c = i % w;
    for (const [tbl, offs] of [[mp.nb8, NB8], [mp.nb4, NB4]]) {
      const out = [];
      for (const [dr, dc] of offs) {
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < h && cc >= 0 && cc < w) out.push(rr * w + cc);
      }
      tbl[i] = out;
    }
  }
  mp.zoneCells = {};
  if (zones) {
    for (const i of mp.foggable) {
      (mp.zoneCells[zones[i]] = mp.zoneCells[zones[i]] || []).push(i);
    }
  }
  return mp;
}

const rcOf = (mp, i) => [(i / mp.w) | 0, i % mp.w];

/* the blob light model: own square plus the eight around it. Measurement
   rejected rays - they overlap so heavily that the fires cannot be recovered
   from the mist, and every clue is a statement about the mist. */
function coverOf(mp, cell) { return [cell].concat(mp.nb8[cell]); }

function litSet(mp, fires) {
  const out = new Set();
  for (const f of fires) { out.add(f); for (const j of mp.nb8[f]) out.add(j); }
  return out;
}
function fogSet(mp, fires) {
  const lit = litSet(mp, fires), out = new Set();
  for (const i of mp.foggable) if (!lit.has(i)) out.add(i);
  return out;
}
function zoneLoad(mp, fog) {
  const out = {};
  for (const i of fog) out[mp.zones[i]] = (out[mp.zones[i]] || 0) + 1;
  return out;
}

/* --------------------------------------------------- 64-bit cell bitsets */
/* The hot loop walks every 4-subset of ~29 squares, so cell sets are two
   32-bit words rather than Sets. */
function pc32(v) {
  v = v >>> 0;
  v = v - ((v >>> 1) & 0x55555555);
  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
  v = (v + (v >>> 4)) & 0x0f0f0f0f;
  return (Math.imul(v, 0x01010101) >>> 24);
}
function bitsOf(cells) {
  let lo = 0, hi = 0;
  for (const c of cells) { if (c < 32) lo |= (1 << c); else hi |= (1 << (c - 32)); }
  return [lo >>> 0, hi >>> 0];
}
function bitsToCells(lo, hi, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const on = i < 32 ? (lo >>> i) & 1 : (hi >>> (i - 32)) & 1;
    if (on) out.push(i);
  }
  return out;
}

/* --------------------------------------------------------------- zones */
/* Irregular connected thickets of roughly equal size, grown from random
   seeds. Ported from gen_zones in mist.py. */
function genZones(rows, w, h, k, rng) {
  const grid = rows.join('');
  const cells = [];
  for (let i = 0; i < w * h; i++) if (grid[i] !== '#') cells.push(i);
  const target = Math.floor(cells.length / k);
  const nbsOf = (i) => {
    const r = (i / w) | 0, c = i % w, out = [];
    for (const [dr, dc] of NB4) {
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < h && cc >= 0 && cc < w && grid[rr * w + cc] !== '#') {
        out.push(rr * w + cc);
      }
    }
    return out;
  };
  for (let attempt = 0; attempt < 400; attempt++) {
    const zones = new Int8Array(w * h).fill(-1);
    const seeds = rngShuffle(rng, cells.slice()).slice(0, k);
    const size = {}, frontier = {};
    seeds.forEach((s, z) => {
      zones[s] = z; size[z] = 1;
      frontier[z] = new Set(nbsOf(s).filter(j => zones[j] === -1));
    });
    let remaining = cells.length - k, stuck = 0;
    while (remaining > 0 && stuck < 200) {
      const order = Object.keys(size).map(Number)
        .sort((a, b) => size[a] - size[b]);
      let grew = false;
      for (const z of order) {
        if (size[z] >= target + 1) continue;
        const opts = [...frontier[z]].filter(j => zones[j] === -1);
        if (!opts.length) continue;
        const j = rngPick(rng, opts);
        zones[j] = z; size[z]++; remaining--;
        nbsOf(j).forEach(x => { if (zones[x] === -1) frontier[z].add(x); });
        grew = true;
        break;
      }
      if (grew) continue;
      stuck++;
      const left = cells.filter(i => zones[i] === -1);
      if (!left.length) break;
      let placed = false;
      for (const i of left) {
        const adj = [...new Set(nbsOf(i).map(j => zones[j]).filter(z => z !== -1))];
        if (!adj.length) continue;
        const z = adj.reduce((a, b) => (size[a] <= size[b] ? a : b));
        zones[i] = z; size[z]++; remaining--;
        nbsOf(i).forEach(x => { if (zones[x] === -1) frontier[z].add(x); });
        placed = true;
        break;
      }
      if (!placed) break;
    }
    if (remaining === 0) return Array.from(zones);
  }
  return null;
}

/* ------------------------------------------------------------ map layout */
/* Procedural maps are what make the level supply actually endless: the shape
   of the ground, the rocks and the landmarks are all rolled from the seed. */
function randomMap(rng, w, h, nRocks, landmarkKeys) {
  for (let attempt = 0; attempt < 300; attempt++) {
    const cells = new Array(w * h).fill('.');
    const taken = [];
    const spaced = (i, minDist) => taken.every(j => {
      const [r1, c1] = [(i / w) | 0, i % w], [r2, c2] = [(j / w) | 0, j % w];
      return Math.max(Math.abs(r1 - r2), Math.abs(c1 - c2)) >= minDist;
    });
    let ok = true;
    // landmarks first, kept apart so their clues talk about different places
    for (const key of landmarkKeys) {
      const spots = [];
      for (let i = 0; i < w * h; i++) if (cells[i] === '.' && spaced(i, 2)) spots.push(i);
      if (!spots.length) { ok = false; break; }
      const i = rngPick(rng, spots);
      cells[i] = key; taken.push(i);
    }
    if (!ok) continue;
    for (let n = 0; n < nRocks; n++) {
      const spots = [];
      for (let i = 0; i < w * h; i++) if (cells[i] === '.' && spaced(i, 2)) spots.push(i);
      if (!spots.length) { ok = false; break; }
      const i = rngPick(rng, spots);
      cells[i] = '#'; taken.push(i);
    }
    if (!ok) continue;
    const rows = [];
    for (let r = 0; r < h; r++) rows.push(cells.slice(r * w, r * w + w).join(''));
    return rows;
  }
  return null;
}

/* ----------------------------------------------------------------- clues */
const UNARY_CLUES = new Set(['SAFE', 'FOGGED', 'NEAR_MONSTER',
  'NO_MONSTER_NEAR', 'FIRE_BESIDE', 'NO_FIRE_BESIDE']);

function cluePieces(c) {
  if (c.kind === 'EITHER') {
    const s = new Set();
    for (const sub of c.args) for (const x of cluePieces(sub)) s.add(x);
    return s;
  }
  if (['ZONE_FOG', 'ZONE_CLEAR', 'COUNT'].includes(c.kind)) return new Set();
  return new Set([c.args[0]]);
}

/* `fog` may be passed in to avoid recomputing it for every clue. */
function testClue(mp, clue, fires, fog) {
  const k = clue.kind, a = clue.args;
  if (k === 'EITHER') return clue.args.some(s => testClue(mp, s, fires, fog));
  const F = fires instanceof Set ? fires : new Set(fires);
  if (k === 'FIRE_BESIDE') return mp.nb8[a[0]].some(j => F.has(j));
  if (k === 'NO_FIRE_BESIDE') return !mp.nb8[a[0]].some(j => F.has(j));
  if (k === 'SCORCH') return mp.nb8[a[0]].filter(j => F.has(j)).length === a[1];
  const g = fog || fogSet(mp, fires);
  switch (k) {
    case 'SAFE': return !g.has(a[0]);
    case 'FOGGED': return g.has(a[0]);
    case 'COUNT': return g.size === a[0];
    case 'ZONE_FOG': return mp.zoneCells[a[0]].some(i => g.has(i));
    case 'ZONE_CLEAR': return !mp.zoneCells[a[0]].some(i => g.has(i));
    case 'NEAR_MONSTER': return mp.nb4[a[0]].some(j => g.has(j));
    case 'NO_MONSTER_NEAR': return !mp.nb4[a[0]].some(j => g.has(j));
  }
  throw new Error('unknown clue ' + k);
}

function clueText(mp, c) {
  const s = T();
  const lm = (i) => s.landmark[mp.landmarks[i]] || ('square ' + i);
  const zn = (z) => s.zone[z] || ('sector ' + z);
  const a = c.args;
  switch (c.kind) {
    case 'SAFE': case 'FOGGED': case 'NEAR_MONSTER':
    case 'NO_MONSTER_NEAR': case 'FIRE_BESIDE': case 'NO_FIRE_BESIDE':
      return s.clue[c.kind](lm(a[0]));
    case 'ZONE_FOG': case 'ZONE_CLEAR':
      return s.clue[c.kind](zn(a[0]));
    case 'COUNT':
      return s.clue.COUNT(a[0]);
    case 'SCORCH':
      return null;                 // drawn on the rock itself
    case 'EITHER': {
      const strip = (t) => t.replace(/\.$/, '').replace(/^The /, 'the ');
      return s.clue.EITHER(strip(clueText(mp, a[0])),
                           strip(clueText(mp, a[1])));
    }
  }
  return c.kind;
}

/* --------------------------------------------------- the circulation-free
   global rule: a thicket hides at most two monsters */
const ZONE_CAP = 2;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { mulberry32, makeMap, genZones, randomMap, litSet, fogSet,
                     zoneLoad, testClue, clueText, cluePieces, STRINGS,
                     ZONE_CAP, bitsOf, bitsToCells, pc32, rngPick, rngShuffle,
                     rngInt, coverOf, rcOf, UNARY_CLUES };
}
