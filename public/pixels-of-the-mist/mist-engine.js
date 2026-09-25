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
      hintWhyForcedFog: 'No fire can reach this square, so it stays foggy — a monster is here.',
      hintWhyOnlySource: 'Some square nearby needs light, and this is the only fire that can reach it.',
      hintWhyLastStandingFire: (clue) => `“${clue}” — every square near it but this one is ruled out.`,
      hintWhyLastStandingFog: (clue) => `“${clue}” — every other square in reach is already clear.`,
      hintWhyFuelSpent: (n) => `All ${n} fires are already placed elsewhere — none are left for here.`,
      hintWhyFuelForced: 'As many open squares are left as fires you have — light them all, including this one.',
      hintWhyMonsterCountFog: (clue) => `“${clue}” — that only works if this square hides one too.`,
      hintWhyMonsterCountClear: (clue) => `“${clue}” — that count is already full, so this square is clear.`,
      hintWhyScorchFire: 'That rock’s scorch mark still needs this fire to reach its count.',
      hintWhyScorchNoFire: 'That rock’s scorch mark already has enough fire — none needed here.',
      hintWhyDisjoint: 'Other safe squares nearby already use up your remaining fires — none are left for here.',
      hintWhyForward: 'The opposite doesn’t work — so this has to be it.',
      hintWrongFireCited: (num, clue) => `That fire is wrong. Testimony #${num}: “${clue}”`,
      hintWrongFireBecause: (reason) => `That fire is wrong: ${reason}`,
      hintWrongFire: 'That fire doesn’t match the testimony.',
      hintNone: 'No hints left. Solve a few more levels to earn one.',
      hintExhausted: 'No more hints for this one — you already have everything the survivors can tell you.',
      hintSolved: 'Nothing left to point out — what you have placed already fits. Press Submit.',
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
      reduceSuddenSounds: 'Reduce sudden sounds',
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
    landmark: { C: 'پناهگاه', M: 'کارگاه', G: 'انبار', S: 'بنای یادبود', W: 'پمپ آب' },
    zone: ['بیابان قراضه', 'باتلاق لجن', 'آوار سنگ‌ها', 'بیابان خاکستر', 'جنگل خشکیده', 'دهانه شهاب‌سنگ'],
    stage: ['', 'شب اول', 'بخش‌ها', 'نشانه‌ها', 'شهادت‌های مشکوک'],
    difficulty: { easy: 'ساده', medium: 'متوسط', hard: 'سخت', expert: 'خبره' },
    clue: {
      SAFE: (n) => `${n} تا سپیده‌دم امن بود.`,
      FOGGED: (n) => `${n} در مه گم شده بود — چیزی آنجا بود.`,
      NEAR_MONSTER: (n) => `هیولایی در نزدیکی ${n} دیده شد.`,
      NO_MONSTER_NEAR: (n) => `تمام شب هیچ‌چیزی به ${n} نزدیک نشد.`,
      FIRE_BESIDE: (n) => `اطراف ${n} آتش روشن بود.`,
      NO_FIRE_BESIDE: (n) => `هیچ آتشی در اطراف ${n} وجود نداشت.`,
      ZONE_FOG: (n) => `یک هیولا در ${n} حضور دارد.`,
      ZONE_CLEAR: (n) => `${n} تا سپیده‌دم آرام باقی ماند.`,
      COUNT: (k) => `آن شب دقیقاً ${k} هیولا شمارش شد.`,
      EITHER: (a, b) => `یا ${a} یا ${b} — دقیقاً یادم نیست کدام بود.`,
    },
    ui: {
      title: 'TLS: Pixels of the Mist',
      rule1: (n) => `سوخت کافی برای روشن کردن <b>${n}</b> آتش داری. آن‌ها را در خانه‌های خالی روشن کن.`,
      rule2: 'آتش، مهِ خانهٔ خود و <b>هشت خانهٔ اطرافش</b> را کنار می‌زند.',
      rule3: 'جایی که نور نرسد، مه باقی می‌ماند — و هیولاها همان‌جا کمین کرده‌اند.',
      rule4: 'در هر بخش حداکثر <b>دو هیولا</b> می‌توانند پنهان شوند.',
      rule5: 'عدد روی صخره نشان‌دهندهٔ تعداد آتش‌های مماس با آن است.',
      fuel: 'سوخت',
      testimony: 'شهادت بازماندگان',
      submit: 'بررسی',
      reset: 'بازنشانی',
      reveal: 'راهنمایی',
      newLevel: 'مرحله جدید',
      hintFireHere: 'راهنمایی: دقیقاً همان‌جا آتش روشن کن.',
      hintNoFireHere: 'راهنمایی: آنجا نیازی به آتش نیست — می‌توانی استثنائش کنی.',
      hintStaysDark: 'راهنمایی: آن خانه در مه باقی می‌ماند. هیولایی آنجاست.',
      hintClearsSafe: 'راهنمایی: آن خانه زمین امن است. هیولایی وجود ندارد.',
      hintWhyForcedFog: 'هیچ آتشی به این خانه نمی‌رسد، پس در مه می‌ماند — هیولا همین‌جاست.',
      hintWhyOnlySource: 'یک خانه‌ی دیگر به نور نیاز دارد، و فقط همین آتش می‌تواند به آن برسد.',
      hintWhyLastStandingFire: (clue) => `«${clue}» — همه‌ی خانه‌های اطرافش به‌جز همین یکی رد شده‌اند.`,
      hintWhyLastStandingFog: (clue) => `«${clue}» — همه‌ی خانه‌های دیگر در آن محدوده از قبل امن شده‌اند.`,
      hintWhyFuelSpent: (n) => `هر ${n} آتشت از قبل جای دیگری گذاشته شده — دیگر برای این‌جا نمانده.`,
      hintWhyFuelForced: 'به‌اندازه‌ی آتش‌های باقی‌مانده‌ات خانه‌ی خالی هست — همه‌شان، از جمله همین یکی، باید روشن شوند.',
      hintWhyMonsterCountFog: (clue) => `«${clue}» — این فقط وقتی درست است که این خانه هم هیولا داشته باشد.`,
      hintWhyMonsterCountClear: (clue) => `«${clue}» — این شمارش از قبل کامل شده، پس این خانه امن است.`,
      hintWhyScorchFire: 'نشان سوختگی روی آن سنگ هنوز به همین آتش نیاز دارد تا شمارش کامل شود.',
      hintWhyScorchNoFire: 'نشان سوختگی روی آن سنگ از قبل کامل شده — این‌جا آتشی لازم نیست.',
      hintWhyDisjoint: 'چند خانه‌ی امن نزدیک هم، بقیه‌ی آتش‌هایت را از قبل مصرف کرده‌اند — این‌جا دیگر جا نیست.',
      hintWhyForward: 'برعکسش جواب نمی‌دهد — پس همین باید باشد.',
      hintWrongFireCited: (num, clue) => `این آتش اشتباه است. شاهد شماره‌ی ${num}: «${clue}»`,
      hintWrongFireBecause: (reason) => `این آتش اشتباه است: ${reason}`,
      hintWrongFire: 'این آتش با شهادت جور درنمی‌آید.',
      hintNone: 'راهنمایی دیگری نمانده. مراحل بیشتری را رد کن تا راهنمایی به دست آوری.',
      hintExhausted: 'راهنمایی دیگری برای این مرحله نیست — تمام آنچه بازماندگان می‌دانستند را دریافت کرده‌ای.',
      hintSolved: 'دیگر چیزی برای گفتن نیست — همین چیدمانی که گذاشته‌ای درست است. بررسی را بزن.',
      hintTap: 'روی خانه بزن تا آتش را <b>پیش‌نمایش</b> کنی. نگه دار یا دابل‌کلیک کن تا <b>روشن</b> شود. روی آتش روشن بزن تا آن را برداری.',
      hintPreview: 'پیش‌نمایش رایگان است — هنگام فکر کردن هرچقدر می‌خواهی امتحان کن.',
      remaining: (n) => `${n} آتش دیگر باید قرار داده شود.`,
      ready: 'آماده برای بررسی.',
      overloaded: (names) => names.length === 1
        ? `بیش از دو هیولا در ${names[0]} تجمع کرده‌اند.`
        : `بیش از دو هیولا در ${names.length} بخش تجمع کرده‌اند.`,
      wrong: 'این با آنچه بازماندگان دیده‌اند همخوانی ندارد.',
      win: 'همه چیز همخوانی دارد. پناهگاه تا سپیده‌دم دوام آورد.',
      resultWinTitle: 'سپیده‌دم',
      resultWinBody: 'همه چیز همخوانی دارد. پناهگاه تا سپیده‌دم دوام آورد.',
      resultLoseTitle: 'سقوط پناهگاه',
      resultLoseBody: 'سه حدس اشتباه، و مه پناهگاه را بلعید.',
      resultNext: 'مرحله بعد',
      resultRetry: 'تلاش مجدد',
      resultMenu: 'منو',
      chapterMapTitle: 'نقشه فصل‌ها',
      chapterMapHint: 'هر بار که وارد می‌شوی، هر بخش به عنوان یک پازل کاملاً جدید بازسازی می‌شود.',
      lockDev: (name) => `${name} در حال توسعه است — لطفا بعداً مراجعه کن.`,
      lockComplete: (name) => `با تکمیل ${name} این فصل باز می‌شود.`,
      lockPurchase: (name) => `${name} یک محصول خریدنی است — پس از خرید باز می‌شود.`,
      levelOf: (n, total) => `مرحله ${n} از ${total}`,
      dailyAgain: 'چالش امروز تکمیل شد. فردا برای چالش جدید برگرد.',
      endlessLabel: 'حالت بی‌نهایت',
      endlessLevel: (n) => `مرحله ${n}`,
      dailyLabel: 'چالش روزانه',
      dailyStreak: (n) => `${n} روز متوالی`,
      tutorialStepOf: (n, total) => `گام ${n} از ${total}`,
      legend: { fire: 'آتش', monster: 'هیولا',
                border: 'هر رنگ نشان‌دهنده یک بخش است', rock: 'آوار، غیرقابل عبور' },
      stageLabel: (n, name) => `مرحله ${n} — ${name}`,
      seed: 'سید (Seed)',
      menuStart: 'شروع',
      menuContinue: 'ادامه',
      solvedLabel: (n, total) => `حل‌شده · ${n}/${total}`,
      chapterMap: 'نقشه فصل‌ها',
      endless: 'بی‌نهایت',
      daily: 'روزانه',
      today: 'امروز',
      howToPlay: 'راهنمای بازی',
      selectChapter: 'انتخاب فصل',
      playTutorial: 'آموزش اولیه',
      htpRule1: 'روی خانه بزن تا پیش‌نمایش آتش را ببینی.',
      htpRule2: 'نگه دار یا دابل‌کلیک کن تا روشن شود (سوخت مصرف می‌کند).',
      htpRule3: 'آتش روشن شده مه اطرافش را کنار می‌زند.',
      htpRule4: 'شهادت بازماندگان به تو می‌گوید کجا نیازی به گشتن نیست.',
      htpRule5: 'روی آتش روشن بزن تا آن را برداری — تا قبل از زدن "بررسی" هیچ‌چیز قطعی نیست.',
      htpRule6: 'سه بررسی اشتباه مرحله را ریست می‌کند. هیچ محدودیت زمانی یا جریمه دیگری وجود ندارد.',
      setupTitle: 'تنظیمات',
      reduceFlicker: 'کاهش چشمک‌زدن تصویر',
      reduceSuddenSounds: 'کاهش صداهای ناگهانی',
      music: 'موسیقی',
      sfx: 'جلوه‌های صوتی',
      ambience: 'صدای محیط',
      soon: 'به‌زودی',
      language: 'زبان',
      rulesTitle: 'قوانین',
      reportSlideLabel: 'گزارش',
      storySlideLabel: 'داستان',
      setupSlideLabel: 'تنظیمات',
      backLabel: 'بازگشت',
      storyLine1: 'ساحل در مه غلیظی فرو رفته است. و هیولاها در آن کمین کرده‌اند.',
      storyLine2: 'آتش تنها پناه امن است. روشنایی مه را عقب می‌راند.',
      storyLine3: 'آن شب تو آنجا نبودی — تنها بازماندگان آنجا بودند.',
      storyLine4: 'گزارش‌های آن‌ها را بخوان. و استنتاج کن آتش کجا می‌سوخته است.',
      generatorError: 'مولد پازل نتوانست مرحله را بسازد.',
      tutorialNext: 'بعدی',
      tutorialFinish: 'پایان',
      hintGotIt: 'متوجه شدم',
      legendBlack: (rock) => `مشکی — ${rock}`,
      chapterFallback: (n) => `فصل ${n}`,
      tutorialCaption1: 'روی خانه بزن تا آتش را <b>پیش‌نمایش</b> کنی. این کار هیچ سوختی مصرف نمی‌کند — موقع فکر کردن راحت امتحان کن.',
      tutorialCaption2: 'حالا نگه دار — یا دابل‌کلیک کن — تا واقعاً آن را <b>روشن</b> کنی. کنار رفتن مه را تماشا کن.',
      tutorialCaption3: 'نظرت عوض شد؟ روی آتش روشن بزن تا برداشته شود، سپس دوباره روشنش کن.',
      tutorialCaption4: 'دو شهادت، یک موقعیت. هر دو را بخوان و آتشی را روشن کن که با شرایط بخواند.',
      tutorialCaption5: '<b>نزدیکی</b> یعنی چهار خانهٔ چسبیده به یک مکان — بالا، پایین، راست، چپ. خانه‌های‌هایلایت‌شده همان منظور شهادت هستند؛ دو آتش روشن کن و بگذار یکی تاریک بماند.',
      tutorialCaption6: 'و برعکس: این بار دو آتش روشن کن تا <b>هر چهار خانهٔ</b> هایلایت‌شده روشن شوند.',
      tutorialCaption7: '<b>اطراف</b> محدودهٔ وسیع‌تری است — شامل هشت خانه با گوشه‌ها. آتشی را در نقطه‌ای داخل منطقه هایلایت‌شده روشن کن.',
      tutorialCaption8: 'و برعکس: آتش را <b>خارج</b> از هشت خانه هایلایت‌شده روشن کن.',
      tutorialCaption9: 'یکی دیگر را امتحان کن — اما این بار وقتی مطمئن شدی <b>بررسی</b> را بزن. گیر کردی؟ <b>راهنمایی</b> همیشه هست و سه حدس اشتباه فقط مرحله را ریست می‌کند.',
      emailPlaceholder: 'you@example.com',
      sendLink: 'ارسال لینک',
      signInPrompt: 'وارد شوید تا خریدها و پیشرفت بازی روی هر دستگاهی حفظ شود.',
      sending: 'در حال ارسال…',
      checkEmail: 'لطفاً ایمیل خود را برای دریافت لینک ورود بررسی کنید.',
      sendFailed: 'ارسال لینک ناموفق بود. لطفاً بعداً دوباره تلاش کنید.',
      signedInAsUsername: (name) => `واردشده با نام کاربری <b>${name}</b>`,
      signedInAsEmail: (email) => `واردشده با ایمیل <b>${email}</b>`,
      usernamePlaceholder: 'انتخاب نام کاربری',
      saveLabel: 'ذخیره',
      usernameTaken: 'این نام کاربری قبلاً گرفته شده است.',
      usernameRules: 'حروف انگلیسی، ارقام، خط زیر، بین ۳ تا ۲۰ کاراکتر.',
      signOut: 'خروج از حساب',
    },
  },
  ar: {
    landmark: { C: 'الملجأ', M: 'الورشة', G: 'المخزن', S: 'النصب التذكاري', W: 'المضخة' },
    zone: ['قفر الخردة', 'أرض الوحل', 'ركام الأنقاض', 'قفر الرماد', 'الأشجار الميتة', 'الفوهة'],
    stage: ['', 'الليلة الأولى', 'المناطق', 'العلامات', 'شهادات مشكوك فيها'],
    difficulty: { easy: 'سهل', medium: 'متوسط', hard: 'صعب', expert: 'خبير' },
    clue: {
      SAFE: (n) => `${n} كان آمناً حتى الفجر.`,
      FOGGED: (n) => `${n} ضاع في الضباب — كان هناك شيء ما.`,
      NEAR_MONSTER: (n) => `شوهد وحش بالقرب من ${n}.`,
      NO_MONSTER_NEAR: (n) => `لم يقترب أي شيء من ${n} طوال الليلة.`,
      FIRE_BESIDE: (n) => `كانت النيران تشتعل حول ${n}.`,
      NO_FIRE_BESIDE: (n) => `لم تكن هناك أي أضواء نارية حول ${n}.`,
      ZONE_FOG: (n) => `يوجد وحش واحد في ${n}.`,
      ZONE_CLEAR: (n) => `ظلت ${n} هادئة حتى الفجر.`,
      COUNT: (k) => `تم إحصاء ${k} من الوحوش بالظبط في تلك الليلة.`,
      EITHER: (a, b) => `إما ${a} أو ${b} — لا أتذكر أيهما بالظبط.`,
    },
    ui: {
      title: 'TLS: Pixels of the Mist',
      rule1: (n) => `لديك وقود يكفي لإشعال <b>${n}</b> من النيران. اشعلها في المساحات الخالية.`,
      rule2: 'شعلة النار تبدد الضباب عن مربّعها و<b>المربّعات الثمانية المحيطة بها</b>.',
      rule3: 'حيث لا يصل الضوء، يبقى الضباب — وتختبئ الوحوش.',
      rule4: 'يمكن لكل منطقة أن تؤوي <b>وحشين</b> كحد أقصى.',
      rule5: 'الرقم على الصخرة يمثل عدد النيران الملامسة لها.',
      fuel: 'الوقود',
      testimony: 'شهادة الناجين',
      submit: 'تأكيد',
      reset: 'إعادة ضبط',
      reveal: 'تلميح',
      newLevel: 'مستوى جديد',
      hintFireHere: 'تلميح: اشعل النار هناك تماماً.',
      hintNoFireHere: 'تلميح: لا حاجة لنار هناك — يمكنك استبعادها.',
      hintStaysDark: 'تلميح: ذلك المربع يبقى في الضباب. هناك وحش بالخارج.',
      hintClearsSafe: 'تلميح: ذلك المربع أرض آمنة. لا يوجد وحش.',
      hintWhyForcedFog: 'لا نار تصل إلى هذا المربع، فيبقى في الضباب — الوحش هنا.',
      hintWhyOnlySource: 'مربع قريب يحتاج للضوء، وهذه هي النار الوحيدة القادرة على الوصول إليه.',
      hintWhyLastStandingFire: (clue) => `«${clue}» — كل المربعات القريبة منه باستثناء هذا استُبعدت.`,
      hintWhyLastStandingFog: (clue) => `«${clue}» — كل المربعات الأخرى في المدى أصبحت آمنة بالفعل.`,
      hintWhyFuelSpent: (n) => `كل نيرانك الـ${n} موضوعة في مكان آخر بالفعل — لا شيء متبقٍ هنا.`,
      hintWhyFuelForced: 'بقي من المربعات المفتوحة بقدر ما تبقى من نيرانك — أشعلها كلها، بما فيها هذا.',
      hintWhyMonsterCountFog: (clue) => `«${clue}» — هذا لا يصح إلا إذا كان هذا المربع يخفي وحشاً أيضاً.`,
      hintWhyMonsterCountClear: (clue) => `«${clue}» — هذا العدد اكتمل بالفعل، فهذا المربع آمن.`,
      hintWhyScorchFire: 'علامة الاحتراق على تلك الصخرة ما زالت تحتاج هذه النار لإكمال العدد.',
      hintWhyScorchNoFire: 'علامة الاحتراق على تلك الصخرة اكتملت بالفعل — لا حاجة لنار هنا.',
      hintWhyDisjoint: 'مربعات آمنة قريبة استهلكت بقية نيرانك بالفعل — لا يوجد شيء متبقٍ هنا.',
      hintWhyForward: 'العكس لا يصح — فلا بد أن يكون هذا هو الصحيح.',
      hintWrongFireCited: (num, clue) => `هذه النار خاطئة. الشهادة رقم ${num}: «${clue}»`,
      hintWrongFireBecause: (reason) => `هذه النار خاطئة: ${reason}`,
      hintWrongFire: 'هذه النار لا تتفق مع الشهادة.',
      hintNone: 'لا توجد تلميحات أخرى. اجتَز المزيد من المستويات لكسب التلميحات.',
      hintExhausted: 'لا توجد تلميحات إضافية لهذا المستوى — لقد حصلت على كل ما يعرفه الناجون.',
      hintSolved: 'لا يوجد شيء آخر لتوضيحه — ما وضعته بالفعل صحيح. اضغط تأكيد.',
      hintTap: 'اضغط على المربع <b>للمعاينة</b>. اضغط مطولاً أو مرتين متتاليتين <b>للإشعال</b>. اضغط على النار المشتعلة لاستعادتها.',
      hintPreview: 'المعاينة مجانية — استكشف كما تشاء أثناء التفكير.',
      remaining: (n) => `متبقي وضع ${n} من النيران.`,
      ready: 'جاهز للتأكيد.',
      overloaded: (names) => names.length === 1
        ? `هناك أكثر من وحشين يتجمعون في ${names[0]}.`
        : `هناك أكثر من وحشين يتجمعون في ${names.length} مناطق.`,
      wrong: 'هذا لا يتوافق مع ما شاهده الناجون.',
      win: 'كل شيء متطابق. صمد الملجأ حتى الفجر.',
      resultWinTitle: 'الفجر',
      resultWinBody: 'كل شيء متطابق. صمد الملجأ حتى الفجر.',
      resultLoseTitle: 'سقوط الملجأ',
      resultLoseBody: 'ثلاثة تخمينات خاطئة، وابتلع الضباب الملجأ.',
      resultNext: 'المستوى التالي',
      resultRetry: 'إعادة المحاولة',
      resultMenu: 'القائمة',
      chapterMapTitle: 'خريطة الفصول',
      chapterMapHint: 'في كل مرة تدخل فيها، تعاد هيكلة المنطقة للغز جديد تماماً.',
      lockDev: (name) => `${name} قيد التطوير حالياً — يرجى العودة لاحقاً.`,
      lockComplete: (name) => `أكمل ${name} لفتح هذا الفصل.`,
      lockPurchase: (name) => `${name} منتج يشترى لمرة واحدة — يتم الفتح بعد الشراء.`,
      levelOf: (n, total) => `المستوى ${n} / ${total}`,
      dailyAgain: 'تم إكمال تحدي اليوم. عد غداً لتحدٍ جديد.',
      endlessLabel: 'الوضع اللانهائي',
      endlessLevel: (n) => `المستوى ${n}`,
      dailyLabel: 'التحدي اليومي',
      dailyStreak: (n) => `سلسلة ${n} أيام`,
      tutorialStepOf: (n, total) => `الخطوة ${n} / ${total}`,
      legend: { fire: 'نار', monster: 'وحش',
                border: 'كل لون يمثل منطقة', rock: 'أنقاض، غير صالحة للمرور' },
      stageLabel: (n, name) => `المرحلة ${n} — ${name}`,
      seed: 'البذرة (Seed)',
      menuStart: 'بدء',
      menuContinue: 'متابعة',
      solvedLabel: (n, total) => `تم حله · ${n}/${total}`,
      chapterMap: 'خريطة الفصول',
      endless: 'لانهائي',
      daily: 'يومي',
      today: 'اليوم',
      howToPlay: 'طريقة اللعب',
      selectChapter: 'اختر الفصل',
      playTutorial: 'بدء التدريب',
      htpRule1: 'اضغط على المربع لمشاهدة معاينة النار.',
      htpRule2: 'اضغط مطولاً أو مرتين للإشعال (يستهلك الوقود).',
      htpRule3: 'النار المشتعلة تبدد الضباب عما حولها.',
      htpRule4: 'شهادات الناجين تخبرك بالأماكن التي لا داعي للبحث فيها.',
      htpRule5: 'اضغط على النار المشتعلة لاستعادتها — لا شيء نهائي حتى تضغط "تأكيد".',
      htpRule6: 'ثلاث محاولات خاطئة تعيد إعادة المستوى. لا يوجد حد زمني أو عقوبات أخرى.',
      setupTitle: 'الإعدادات',
      reduceFlicker: 'تقليل الوميض',
      reduceSuddenSounds: 'تقليل الأصوات المفاجئة',
      music: 'الموسيقى',
      sfx: 'المؤثرات الصوتية',
      ambience: 'الأصوات المحيطة',
      soon: 'قريباً',
      language: 'اللغة',
      rulesTitle: 'القواعد',
      reportSlideLabel: 'التقرير',
      storySlideLabel: 'القصة',
      setupSlideLabel: 'الإعدادات',
      backLabel: 'عودة',
      storyLine1: 'الساحل مغطى بضباب كثيف. والوحوش تتربص فيه.',
      storyLine2: 'النار هي الأمان الوحيد. الضوء يدحر الضباب.',
      storyLine3: 'لم تكن هناك في تلك الليلة — وحدهم الناجون كانوا هناك.',
      storyLine4: 'اقرأ شهاداتهم. واستنتج أين كانت النيران تشتعل.',
      generatorError: 'تعذر على المولد إنشاء المستوى.',
      tutorialNext: 'التالي',
      tutorialFinish: 'إنهاء',
      hintGotIt: 'فهمت',
      legendBlack: (rock) => `أسود — ${rock}`,
      chapterFallback: (n) => `الفصل ${n}`,
      tutorialCaption1: 'اضغط على المربع <b>للمعاينة</b>. هذا لا يستهلك شيئاً — جرب كما تشاء أثناء التفكير.',
      tutorialCaption2: 'الآن اضغط مطولاً — أو مرتين — <b>لإشعالها</b> فعلياً. شاهد الضباب وهو ينقشع.',
      tutorialCaption3: 'غيرت رأيك؟ اضغط على النار المشتعلة لاستعادتها، ثم اشعلها مجدداً.',
      tutorialCaption4: 'شهادتان، وموقع واحد. اقرأ الاثنين، ثم اشعل النار في المكان المطابق.',
      tutorialCaption5: '<b>بالقرب</b> تعني المربعات الأربعة الملاصقة للموقع — أعلى، أسفل، يمين، يسار. المربعات المظللة هي ما تعنيه الشهادة؛ اشعل نارين واترك واحداً مظلماً.',
      tutorialCaption6: 'والعكس صحيح: هذه المرة اشعل نارين لجعل <b>جميع المربعات الأربعة</b> المظللة واضحة.',
      tutorialCaption7: '<b>حول</b> تشمل نطاقاً أوسع — المربعات الثمانية بما فيها الزوايا. اشعل ناراً واحدة في مكان ما داخل المنطقة المظللة.',
      tutorialCaption8: 'والعكس صحيح: اشعل النار <b>خارج</b> المربعات الثمانية المظللة.',
      tutorialCaption9: 'جرب واحدة أخرى — لكن عندما تكون راضياً هذه المرة اضغط <b>تأكيد</b>. هل علقت؟ <b>التلميح</b> متوفر دائماً، والتخمينات الخاطئة الثلاث تكتفي بإعادة المستوى.',
      emailPlaceholder: 'you@example.com',
      sendLink: 'إرسال الرابط',
      signInPrompt: 'سجل الدخول للحفاظ على مشترياتك وتقدمك عبر أي جهاز.',
      sending: 'جاري الإرسال…',
      checkEmail: 'يرجى التحقق من بريدك الإلكتروني للحصول على رابط تسجيل الدخول.',
      sendFailed: 'تعذر إرسال الرابط. يرجى المحاولة لاحقاً.',
      signedInAsUsername: (name) => `مسجل الدخول باسم <b>${name}</b>`,
      signedInAsEmail: (email) => `مسجل الدخول بـ <b>${email}</b>`,
      usernamePlaceholder: 'اختر اسم مستخدم',
      saveLabel: 'حفظ',
      usernameTaken: 'اسم المستخدم هذا مستخدم بالفعل.',
      usernameRules: 'أحرف، أرقام، شرطة سفلية، من 3 إلى 20 حرفاً.',
      signOut: 'تسجيل الخروج',
    },
  },
  zh: {
    landmark: { C: '避难所', M: '工坊', G: '仓库', S: '纪念碑', W: '水泵' },
    zone: ['废铁荒野', '淤泥地', '瓦砾堆', '灰烬荒野', '枯木林', '陨石坑'],
    stage: ['', '首夜', '区域', '迹象', '存疑的证言'],
    difficulty: { easy: '简单', medium: '中等', hard: '困难', expert: '专家' },
    clue: {
      SAFE: (n) => `${n}直到黎明都很安全。`,
      FOGGED: (n) => `${n}迷失在雾中——那里曾有什么东西。`,
      NEAR_MONSTER: (n) => `在${n}附近看到了怪物。`,
      NO_MONSTER_NEAR: (n) => `整晚没有任何东西靠近${n}。`,
      FIRE_BESIDE: (n) => `${n}周围点着火。`,
      NO_FIRE_BESIDE: (n) => `${n}周围没有任何火光。`,
      ZONE_FOG: (n) => `${n}里有一只怪物。`,
      ZONE_CLEAR: (n) => `${n}直到黎明都保持着平静。`,
      COUNT: (k) => `那一晚清点到了恰好 ${k} 只怪物。`,
      EITHER: (a, b) => `要么是${a}，要么是${b}——我不记得到底是哪个了。`,
    },
    ui: {
      title: 'TLS: Pixels of the Mist',
      rule1: (n) => `你的燃料足够点燃 <b>${n}</b> 堆篝火。在空地上点燃它们。`,
      rule2: '篝火可以驱散所在格子及其<b>周围八个格子</b>的迷雾。',
      rule3: '光线照不到的地方，迷雾依然存在——怪物也潜伏其中。',
      rule4: '一个区域最多只能藏匿 <b>两只</b> 怪物。',
      rule5: '岩石上的数字代表触及它的篝火数量。',
      fuel: '燃料',
      testimony: '幸存者证言',
      submit: '提交',
      reset: '重置',
      reveal: '提示',
      newLevel: '新关卡',
      hintFireHere: '提示：就在那里点燃篝火。',
      hintNoFireHere: '提示：那里不需要篝火——你可以排除它。',
      hintStaysDark: '提示：那个格子保留在迷雾中。外面有怪物。',
      hintClearsSafe: '提示：那个格子是安全地面。没有怪物。',
      hintWhyForcedFog: '没有篝火能照到这里，所以它一直笼罩在迷雾中——怪物就在这里。',
      hintWhyOnlySource: '附近有个格子需要光，而只有这处篝火能照到它。',
      hintWhyLastStandingFire: (clue) => `「${clue}」——附近除了这里，其他格子都已排除。`,
      hintWhyLastStandingFog: (clue) => `「${clue}」——范围内其他格子都已经安全了。`,
      hintWhyFuelSpent: (n) => `你的${n}处篝火都已经放在别处了——这里分不到了。`,
      hintWhyFuelForced: '剩下的空格数正好等于你剩下的篝火数——包括这里，都要点亮。',
      hintWhyMonsterCountFog: (clue) => `「${clue}」——只有这里也藏着怪物，这个数字才对。`,
      hintWhyMonsterCountClear: (clue) => `「${clue}」——这个数字已经够了，所以这里是安全的。`,
      hintWhyScorchFire: '那块岩石的焦痕还差这处篝火才能凑够数。',
      hintWhyScorchNoFire: '那块岩石的焦痕已经够了——这里不需要篝火。',
      hintWhyDisjoint: '附近几个安全格子已经用光了你剩下的篝火——这里分不到了。',
      hintWhyForward: '反过来就说不通——所以只能是这样。',
      hintWrongFireCited: (num, clue) => `这处篝火错了。第${num}条证言：「${clue}」`,
      hintWrongFireBecause: (reason) => `这处篝火错了：${reason}`,
      hintWrongFire: '这处篝火和证言对不上。',
      hintNone: '没有提示了。再通关几个关卡来赚取提示。',
      hintExhausted: '本关没有更多提示了——你已经掌握了幸存者能提供的一切信息。',
      hintSolved: '没有更多可指出的了——你摆放的已经是对的。点击提交吧。',
      hintTap: '点击格子<b>预览</b>篝火。长按或双击<b>点燃</b>。点击已点燃的篝火可收回。',
      hintPreview: '预览是免费的——在思考时可以尽情预览。',
      remaining: (n) => `还需放置 ${n} 堆篝火。`,
      ready: '准备提交。',
      overloaded: (names) => names.length === 1
        ? `有超过两只怪物聚集在${names[0]}。`
        : `有超过两只怪物聚集在 ${names.length} 个区域。`,
      wrong: '这与幸存者所看到的不符。',
      win: '一切都吻合了。避难所坚守到了黎明。',
      resultWinTitle: '黎明',
      resultWinBody: '一切都吻合了。避难所坚守到了黎明。',
      resultLoseTitle: '失守',
      resultLoseBody: '三次错误的推测，迷雾吞噬了避难所。',
      resultNext: '下一关',
      resultRetry: '重试',
      resultMenu: '菜单',
      chapterMapTitle: '章节地图',
      chapterMapHint: '每次进入时，每个区域都会重置为全新的谜题。',
      lockDev: (name) => `${name}仍在编写中——请稍后再来。`,
      lockComplete: (name) => `完成${name}即可解锁此章节。`,
      lockPurchase: (name) => `${name}为一次性购买商品——购买后解锁。`,
      levelOf: (n, total) => `第 ${n} / ${total} 关`,
      dailyAgain: '今天的挑战已完成。明天再来尝试新挑战吧。',
      endlessLabel: '无尽模式',
      endlessLevel: (n) => `第 ${n} 关`,
      dailyLabel: '每日挑战',
      dailyStreak: (n) => `连续 ${n} 天`,
      tutorialStepOf: (n, total) => `第 ${n} / ${total} 步`,
      legend: { fire: '篝火', monster: '怪物',
                border: '每种颜色代表一个区域', rock: '瓦砾，无法通行' },
      stageLabel: (n, name) => `阶段 ${n} — ${name}`,
      seed: '种子',
      menuStart: '开始',
      menuContinue: '继续',
      solvedLabel: (n, total) => `已解开 · ${n}/${total}`,
      chapterMap: '章节地图',
      endless: '无尽',
      daily: '每日',
      today: '今天',
      howToPlay: '玩法说明',
      selectChapter: '选择章节',
      playTutorial: '进行新手教学',
      htpRule1: '点击格子预览篝火。',
      htpRule2: '长按或双击点燃——这会消耗燃料。',
      htpRule3: '点燃的篝火会驱散周围的迷雾。',
      htpRule4: '幸存者的证言会告诉你哪里不需要查看。',
      htpRule5: '点击已点燃的篝火可将其收回——在点击"提交"之前一切都不是定局。',
      htpRule6: '三次错误提交会重置关卡。除此之外没有时间限制或额外惩罚。',
      setupTitle: '设置',
      reduceFlicker: '减少闪烁',
      reduceSuddenSounds: '减少突发音效',
      music: '音乐',
      sfx: '音效',
      ambience: '环境音',
      soon: '敬请期待',
      language: '语言',
      rulesTitle: '规则',
      reportSlideLabel: '报告',
      storySlideLabel: '故事',
      setupSlideLabel: '设置',
      backLabel: '返回',
      storyLine1: '海岸被浓雾笼罩。怪物潜伏其中。',
      storyLine2: '火焰是唯一的安全保障。光明将迷雾驱退。',
      storyLine3: '那一晚你并不在场——只有幸存者在。',
      storyLine4: '阅读他们的目击记录。推断出篝火曾在何处燃烧。',
      generatorError: '生成器无法创建关卡。',
      tutorialNext: '下一步',
      tutorialFinish: '完成',
      hintGotIt: '明白了',
      legendBlack: (rock) => `黑色 — ${rock}`,
      chapterFallback: (n) => `第 ${n} 章`,
      tutorialCaption1: '点击格子<b>预览</b>篝火。这不消耗任何东西——在思考时可以尽情放置。',
      tutorialCaption2: '现在长按——或双击——来实际<b>点燃</b>它。观察迷雾退去。',
      tutorialCaption3: '改变主意了？点击已点燃的篝火取回，然后再次点燃。',
      tutorialCaption4: '两条证言，一个位置。阅读两者，然后点燃符合条件的那个。',
      tutorialCaption5: '<b>附近</b>指的是紧挨着某个地点的四个格子——上下左右。高亮显示的格子就是这条证言的意思；点燃两堆火，使其中一个保持黑暗。',
      tutorialCaption6: '反之亦然：这次点燃两堆火，使高亮显示的<b>所有四个</b>格子都变清亮。',
      tutorialCaption7: '<b>周围</b>范围更广——包含角落的八个格子。在高亮区域内的某个地方点燃一堆火。',
      tutorialCaption8: '反之亦然：在高亮显示的八个格子<b>之外</b>点燃篝火。',
      tutorialCaption9: '再试一个——但这次满意时请按<b>提交</b>。卡住了？<b>提示</b>一直都在，三次错误推测只会重置关卡。',
      emailPlaceholder: 'you@example.com',
      sendLink: '发送链接',
      signInPrompt: '登录以在任何设备上保留购买和进度。',
      sending: '发送中…',
      checkEmail: '请检查您的电子邮件以获取登录链接。',
      sendFailed: '无法发送链接。请稍后再试。',
      signedInAsUsername: (name) => `已登录为 <b>${name}</b>`,
      signedInAsEmail: (email) => `已登录为 <b>${email}</b>`,
      usernamePlaceholder: '选择一个用户名',
      saveLabel: '保存',
      usernameTaken: '该用户名已被占用。',
      usernameRules: '字母、数字、下划线，3-20个字符。',
      signOut: '退出登录',
    },
  },
  de: {
    landmark: { C: 'Zuflucht', M: 'Werkstatt', G: 'Lager', S: 'Mahnmal', W: 'Pumpe' },
    zone: ['Schrottplatz', 'Schlamm', 'Geröll', 'Aschenfeld', 'Toter Hain', 'Krater'],
    stage: ['', 'Erste Nacht', 'Die Sektoren', 'Zeichen', 'Zweifelhafter Zeuge'],
    difficulty: { easy: 'Leicht', medium: 'Mittel', hard: 'Schwer', expert: 'Experte' },
    clue: {
      SAFE: (n) => `Der Bereich ${n} war bis zum Morgengrauen sicher.`,
      FOGGED: (n) => `Der Bereich ${n} verlor sich im Nebel — etwas war dort.`,
      NEAR_MONSTER: (n) => `Ein Monster wurde direkt bei ${n} gesehen.`,
      NO_MONSTER_NEAR: (n) => `Die ganze Nacht kam nichts an ${n} heran.`,
      FIRE_BESIDE: (n) => `Ein Feuer brannte rund um ${n}.`,
      NO_FIRE_BESIDE: (n) => `Nirgendwo um ${n} brannte ein Feuer.`,
      ZONE_FOG: (n) => `Es gab ein Monster in ${n}.`,
      ZONE_CLEAR: (n) => `Der Bereich ${n} blieb bis zum Morgengrauen frei.`,
      COUNT: (k) => `Genau ${k} Monster wurden in jener Nacht gezählt.`,
      EITHER: (a, b) => `Entweder ${a} oder ${b} — ich erinnere mich nicht.`,
    },
    ui: {
      title: 'TLS: Pixels of the Mist',
      rule1: (n) => `Du hast Brennstoff für <b>${n}</b> Feuer. Zünde jedes auf freiem Feld an.`,
      rule2: 'Ein Feuer vertreibt den Nebel vom eigenen Feld und den <b>acht Feldern darum</b>.',
      rule3: 'Wo das Licht nicht hinreicht, bleibt der Nebel — und mit ihm ein Monster.',
      rule4: 'Ein Sektor kann höchstens <b>zwei</b> Monster verbergen.',
      rule5: 'Eine Zahl auf einem Felsen zeigt an, wie viele Feuer ihn berühren.',
      fuel: 'Brennstoff',
      testimony: 'Zeugenaussagen',
      submit: 'Prüfen',
      reset: 'Leeren',
      reveal: 'Tipp',
      newLevel: 'Neues Level',
      hintFireHere: 'Ein Tipp: Zünde hier ein Feuer an.',
      hintNoFireHere: 'Ein Tipp: Hier kommt kein Feuer hin — du kannst es ausschließen.',
      hintStaysDark: 'Ein Tipp: Dieses Feld bleibt im Nebel. Dort draußen ist ein Monster.',
      hintClearsSafe: 'Ein Tipp: Dieses Feld ist sicher. Kein Monster dort.',
      hintWhyForcedFog: 'Kein Feuer erreicht dieses Feld, also bleibt es im Nebel — hier ist ein Monster.',
      hintWhyOnlySource: 'Ein Feld in der Nähe braucht Licht, und nur dieses Feuer kann es erreichen.',
      hintWhyLastStandingFire: (clue) => `„${clue}“ — alle Felder in der Nähe außer diesem sind ausgeschlossen.`,
      hintWhyLastStandingFog: (clue) => `„${clue}“ — alle anderen Felder in Reichweite sind schon sicher.`,
      hintWhyFuelSpent: (n) => `Alle ${n} deiner Feuer stehen schon anderswo — hier bleibt keins übrig.`,
      hintWhyFuelForced: 'Es sind noch genau so viele freie Felder wie Feuer übrig — zünde sie alle an, auch dieses.',
      hintWhyMonsterCountFog: (clue) => `„${clue}“ — das stimmt nur, wenn hier auch ein Monster steckt.`,
      hintWhyMonsterCountClear: (clue) => `„${clue}“ — diese Zahl ist schon erreicht, also ist dieses Feld sicher.`,
      hintWhyScorchFire: 'Die Brandspur an diesem Felsen braucht noch dieses Feuer, um auf die Zahl zu kommen.',
      hintWhyScorchNoFire: 'Die Brandspur an diesem Felsen hat schon genug Feuer — hier keins mehr.',
      hintWhyDisjoint: 'Sichere Felder in der Nähe haben schon den Rest deiner Feuer verbraucht — hier bleibt keins.',
      hintWhyForward: 'Umgekehrt geht es nicht — also muss es so sein.',
      hintWrongFireCited: (num, clue) => `Dieses Feuer ist falsch. Aussage Nr. ${num}: „${clue}“`,
      hintWrongFireBecause: (reason) => `Dieses Feuer ist falsch: ${reason}`,
      hintWrongFire: 'Dieses Feuer passt nicht zur Aussage.',
      hintNone: 'Keine Tipps mehr übrig. Löse weitere Level, um einen zu erhalten.',
      hintExhausted: 'Keine Tipps mehr hierfür — du weißt bereits alles, was die Überlebenden dir sagen können.',
      hintSolved: 'Nichts mehr zu zeigen — was du gelegt hast, passt schon. Drück Prüfen.',
      hintTap: 'Tippe auf ein Feld für eine <b>Vorschau</b>. Halten oder doppelt tippen zum <b>Anzünden</b>. Tippe auf ein brennendes Feuer, um es zurückzunehmen.',
      hintPreview: 'Vorschauen sind kostenlos — halte so viele wie du willst, während du nachdenkst.',
      remaining: (n) => `Noch ${n} Feuer zu platzieren.`,
      ready: 'Bereit zur Prüfung.',
      overloaded: (names) => names.length === 1
        ? `Mehr als zwei Monster haben sich im Sektor ${names[0]} versammelt.`
        : `Mehr als zwei Monster haben sich in ${names.length} Sektoren versammelt.`,
      wrong: 'Das stimmt nicht mit den Aussagen der Überlebenden überein.',
      win: 'Alles passt. Die Zuflucht hielt bis zum Morgengrauen.',
      resultWinTitle: 'Morgengrauen',
      resultWinBody: 'Alles passt. Die Zuflucht hielt bis zum Morgengrauen.',
      resultLoseTitle: 'Überrannt',
      resultLoseBody: 'Drei falsche Versuche, und der Nebel verschlang die Zuflucht.',
      resultNext: 'Nächstes Level',
      resultRetry: 'Erneut',
      resultMenu: 'Menü',
      chapterMapTitle: 'Kapitelkarte',
      chapterMapHint: 'Jeder Sektor mischt sich zu einem neuen Rätsel, wenn du ihn betrittst.',
      lockDev: (name) => `${name} wird noch geschrieben — schau bald wieder vorbei.`,
      lockComplete: (name) => `Schließe ${name} ab, um dieses Kapitel freizuschalten.`,
      lockPurchase: (name) => `${name} ist ein Einmalkauf — kaufe es zum Freischalten.`,
      levelOf: (n, total) => `Level ${n} von ${total}`,
      dailyAgain: 'Die heutige Herausforderung ist geschafft. Komm morgen für eine neue zurück.',
      endlessLabel: 'Endlosmodus',
      endlessLevel: (n) => `Level ${n}`,
      dailyLabel: 'Tägliche Herausforderung',
      dailyStreak: (n) => n === 1 ? '1 Tag in Folge' : `${n} Tage in Folge`,
      tutorialStepOf: (n, total) => `Schritt ${n} von ${total}`,
      legend: { fire: 'Feuer', monster: 'Monster',
                border: 'jede Farbe ist ein Sektor', rock: 'Geröll, unpassierbar' },
      stageLabel: (n, name) => `Stufe ${n} — ${name}`,
      seed: 'Seed',
      menuStart: 'Start',
      menuContinue: 'Weiter',
      solvedLabel: (n, total) => `Gelöst · ${n}/${total}`,
      chapterMap: 'Kapitelkarte',
      endless: 'Endlos',
      daily: 'Täglich',
      today: 'Heute',
      howToPlay: 'Spielregeln',
      selectChapter: 'Kapitel wählen',
      playTutorial: 'Tutorial spielen',
      htpRule1: 'Tippe auf ein Feld für eine Feuervorschau.',
      htpRule2: 'Halten oder doppelt tippen zum Anzünden — das kostet Brennstoff.',
      htpRule3: 'Ein brennendes Feuer lichtet den Nebel drumherum.',
      htpRule4: 'Zeugenaussagen sagen dir, wo du nicht suchen sollst.',
      htpRule5: 'Tippe auf ein Feuer, um es zurückzunehmen — nichts ist final bis zur Prüfung.',
      htpRule6: 'Drei falsche Versuche setzen das Level zurück. Keine Timer, keine weiteren Strafen.',
      setupTitle: 'Einstellungen',
      reduceFlicker: 'Flackern reduzieren',
      reduceSuddenSounds: 'Plötzliche Geräusche reduzieren',
      music: 'Musik',
      sfx: 'Effekte',
      ambience: 'Ambiente',
      soon: 'Bald',
      language: 'Sprache',
      rulesTitle: 'Regeln',
      reportSlideLabel: 'Bericht',
      storySlideLabel: 'Story',
      setupSlideLabel: 'Optionen',
      backLabel: 'Zurück',
      storyLine1: 'Die Küste ist in Nebel gehüllt. Monster lauern darin.',
      storyLine2: 'Feuer ist der einzige Schutz. Licht drängt den Nebel zurück.',
      storyLine3: 'Du warst in jener Nacht nicht dort — nur die Überlebenden.',
      storyLine4: 'Lies, was sie sahen. Finde heraus, wo die Feuer brannten.',
      generatorError: 'Der Generator konnte kein Level erstellen.',
      tutorialNext: 'Weiter',
      tutorialFinish: 'Beenden',
      hintGotIt: 'Verstanden',
      legendBlack: (rock) => `schwarz — ${rock}`,
      chapterFallback: (n) => `Kapitel ${n}`,
      tutorialCaption1: 'Tippe auf ein Feld für eine <b>Vorschau</b>. Kostet nichts — halte so viele wie du willst.',
      tutorialCaption2: 'Halte es jetzt gedrückt — oder tippe doppelt — um es <b>anzuzünden</b>. Sieh, wie der Nebel weicht.',
      tutorialCaption3: 'Meinung geändert? Tippe auf ein Feuer, um es zurückzunehmen, und zünde es woanders an.',
      tutorialCaption4: 'Zwei Zeugenaussagen, ein Feld zu besetzen. Lies beide und zünde das passende an.',
      tutorialCaption5: '<b>Direkt bei</b> meint die vier angrenzenden Felder. Platziere zwei Feuer, sodass eines der markierten Felder dunkel bleibt.',
      tutorialCaption6: 'Das Gegenteil: Zünde diesmal beide Feuer an, sodass <b>alle vier</b> markierten Felder hell werden.',
      tutorialCaption7: '<b>Rund um</b> ist weiter gefasst — alle acht Felder drumherum. Zünde ein Feuer innerhalb der Markierung an.',
      tutorialCaption8: 'Und das Gegenteil: Zünde das Feuer <b>außerhalb</b> der acht markierten Felder an.',
      tutorialCaption9: 'Noch eins — aber drücke <b>Prüfen</b>, wenn du fertig bist. <b>Tipp</b> hilft immer, und nach drei Fehlern wird das Level nur zurückgesetzt.',
      emailPlaceholder: 'du@beispiel.de',
      sendLink: 'Link senden',
      signInPrompt: 'Melde dich an, um Käufe und Fortschritte geräteübergreifend zu speichern.',
      sending: 'Sendet…',
      checkEmail: 'Prüfe deine E-Mails auf den Anmelde-Link.',
      sendFailed: 'Link konnte nicht gesendet werden. Versuche es gleich nochmal.',
      signedInAsUsername: (name) => `Angemeldet als <b>${name}</b>`,
      signedInAsEmail: (email) => `Angemeldet als <b>${email}</b>`,
      usernamePlaceholder: 'Benutzername wählen',
      saveLabel: 'Speichern',
      usernameTaken: 'Dieser Benutzername ist vergeben.',
      usernameRules: 'Buchstaben, Zahlen, Unterstrich, 3-20 Zeichen.',
      signOut: 'Abmelden',
    },
  },
  es: {
    landmark: { C: 'Refugio', M: 'Taller', G: 'Almacén', S: 'Monumento', W: 'Bomba' },
    zone: ['Chatarrería', 'Lodo', 'Escombros', 'Cenizal', 'Arboleda Muerta', 'Cráter'],
    stage: ['', 'Primera Noche', 'Los Sectores', 'Señales', 'Testigo Dudoso'],
    difficulty: { easy: 'Fácil', medium: 'Medio', hard: 'Difícil', expert: 'Experto' },
    clue: {
      SAFE: (n) => `La zona ${n} estuvo a salvo hasta el amanecer.`,
      FOGGED: (n) => `La zona ${n} se perdió en la niebla — algo había allí.`,
      NEAR_MONSTER: (n) => `Se vio un monstruo justo cerca de ${n}.`,
      NO_MONSTER_NEAR: (n) => `Nada se acercó a ${n} en toda la noche.`,
      FIRE_BESIDE: (n) => `Un fuego ardía alrededor de ${n}.`,
      NO_FIRE_BESIDE: (n) => `Ningún fuego ardió alrededor de ${n}.`,
      ZONE_FOG: (n) => `Había un monstruo en ${n}.`,
      ZONE_CLEAR: (n) => `La zona ${n} se mantuvo despejada hasta el alba.`,
      COUNT: (k) => `Exactamente ${k} monstruos se contaron esa noche.`,
      EITHER: (a, b) => `O fue ${a} o fue ${b} — no lo recuerdo bien.`,
    },
    ui: {
      title: 'TLS: Pixels of the Mist',
      rule1: (n) => `Tienes combustible para <b>${n}</b> hogueras. Enciende cada una en terreno abierto.`,
      rule2: 'Una hoguera despeja la niebla de su propia casilla y de las <b>ocho de alrededor</b>.',
      rule3: 'Donde la luz no llega, la niebla se queda — y un monstruo con ella.',
      rule4: 'Un sector puede ocultar como máximo <b>dos</b> monstruos.',
      rule5: 'Un número en una roca indica cuántas hogueras la tocan.',
      fuel: 'Combustible',
      testimony: 'Testimonio',
      submit: 'Enviar',
      reset: 'Borrar',
      reveal: 'Pista',
      newLevel: 'Nuevo nivel',
      hintFireHere: 'Una pista: enciende un fuego justo ahí.',
      hintNoFireHere: 'Una pista: ahí no va ningún fuego — puedes descartarlo.',
      hintStaysDark: 'Una pista: esa casilla se queda en la niebla. Hay un monstruo ahí.',
      hintClearsSafe: 'Una pista: esa casilla es terreno seguro. No hay monstruo.',
      hintWhyForcedFog: 'Ningún fuego alcanza esta casilla, así que sigue en la niebla — hay un monstruo aquí.',
      hintWhyOnlySource: 'Una casilla cercana necesita luz, y este es el único fuego que puede alcanzarla.',
      hintWhyLastStandingFire: (clue) => `«${clue}» — todas las casillas cercanas menos esta ya están descartadas.`,
      hintWhyLastStandingFog: (clue) => `«${clue}» — todas las demás casillas a su alcance ya están despejadas.`,
      hintWhyFuelSpent: (n) => `Tus ${n} fuegos ya están colocados en otro sitio — no queda ninguno para aquí.`,
      hintWhyFuelForced: 'Quedan tantas casillas abiertas como fuegos te quedan — enciéndelos todos, incluido este.',
      hintWhyMonsterCountFog: (clue) => `«${clue}» — eso solo cuadra si esta casilla también esconde uno.`,
      hintWhyMonsterCountClear: (clue) => `«${clue}» — esa cuenta ya se cumplió, así que esta casilla está despejada.`,
      hintWhyScorchFire: 'La marca de esa roca todavía necesita este fuego para completar la cuenta.',
      hintWhyScorchNoFire: 'La marca de esa roca ya tiene todo el fuego que necesita — ninguno más aquí.',
      hintWhyDisjoint: 'Unas casillas seguras cercanas ya han gastado el resto de tus fuegos — no queda ninguno para aquí.',
      hintWhyForward: 'Al revés no funciona — así que tiene que ser esto.',
      hintWrongFireCited: (num, clue) => `Ese fuego está mal. Testimonio n.º ${num}: «${clue}»`,
      hintWrongFireBecause: (reason) => `Ese fuego está mal: ${reason}`,
      hintWrongFire: 'Ese fuego no coincide con el testimonio.',
      hintNone: 'No quedan pistas. Resuelve algunos niveles más para ganar una.',
      hintExhausted: 'No hay más pistas aquí — ya tienes todo lo que los supervivientes pueden decirte.',
      hintSolved: 'No queda nada que señalar — lo que has colocado ya encaja. Pulsa Enviar.',
      hintTap: 'Toca una casilla para <b>previsualizar</b> un fuego. Mantén o toca dos veces para <b>encenderlo</b>. Toca un fuego encendido para quitarlo.',
      hintPreview: 'Las previsualizaciones son gratis — mantén todas las que quieras mientras piensas.',
      remaining: (n) => `Falta${n === 1 ? '' : 'n'} ${n} fuego${n === 1 ? '' : 's'} por colocar.`,
      ready: 'Listo para enviar.',
      overloaded: (names) => names.length === 1
        ? `Más de dos monstruos se han reunido en el sector ${names[0]}.`
        : `Más de dos monstruos se han reunido en ${names.length} sectores.`,
      wrong: 'Esto no coincide con lo que vieron los supervivientes.',
      win: 'Todo encaja. El refugio aguantó hasta el amanecer.',
      resultWinTitle: 'Amanecer',
      resultWinBody: 'Todo encaja. El refugio aguantó hasta el amanecer.',
      resultLoseTitle: 'Invadido',
      resultLoseBody: 'Tres intentos fallidos, y la niebla tomó el refugio.',
      resultNext: 'Siguiente nivel',
      resultRetry: 'Reintentar',
      resultMenu: 'Menú',
      chapterMapTitle: 'Mapa de Capítulos',
      chapterMapHint: 'Cada sector se baraja en un nuevo puzle cada vez que entras.',
      lockDev: (name) => `${name} aún se está escribiendo — vuelve pronto.`,
      lockComplete: (name) => `Completa ${name} para desbloquear este capítulo.`,
      lockPurchase: (name) => `${name} es una compra única — cómpralo para desbloquear.`,
      levelOf: (n, total) => `Nivel ${n} de ${total}`,
      dailyAgain: 'El reto de hoy ha terminado. Vuelve mañana para uno nuevo.',
      endlessLabel: 'Modo Infinito',
      endlessLevel: (n) => `Nivel ${n}`,
      dailyLabel: 'Reto Diario',
      dailyStreak: (n) => n === 1 ? 'Racha de 1 día' : `Racha de ${n} días`,
      tutorialStepOf: (n, total) => `Paso ${n} de ${total}`,
      legend: { fire: 'fuego', monster: 'monstruo',
                border: 'cada color es un sector', rock: 'escombros, impasables' },
      stageLabel: (n, name) => `Fase ${n} — ${name}`,
      seed: 'Semilla',
      menuStart: 'Jugar',
      menuContinue: 'Continuar',
      solvedLabel: (n, total) => `Resueltos · ${n}/${total}`,
      chapterMap: 'Mapa de Capítulos',
      endless: 'Infinito',
      daily: 'Diario',
      today: 'Hoy',
      howToPlay: 'Cómo Jugar',
      selectChapter: 'Elegir Capítulo',
      playTutorial: 'Jugar Tutorial',
      htpRule1: 'Toca una casilla para previsualizar un fuego.',
      htpRule2: 'Mantén o toca dos veces para encenderlo — esto gasta combustible.',
      htpRule3: 'Un fuego encendido despeja la niebla a su alrededor.',
      htpRule4: 'El testimonio de los supervivientes te dice dónde no buscar.',
      htpRule5: 'Toca un fuego para quitarlo — nada es definitivo hasta Enviar.',
      htpRule6: 'Tres envíos erróneos reinician el nivel. Sin tiempo límite, sin penalización adicional.',
      setupTitle: 'Ajustes',
      reduceFlicker: 'Reducir parpadeo',
      reduceSuddenSounds: 'Reducir sonidos bruscos',
      music: 'Música',
      sfx: 'Efectos',
      ambience: 'Ambiente',
      soon: 'Pronto',
      language: 'Idioma',
      rulesTitle: 'Reglas',
      reportSlideLabel: 'Informe',
      storySlideLabel: 'Historia',
      setupSlideLabel: 'Ajustes',
      backLabel: 'Atrás',
      storyLine1: 'La costa está cubierta de niebla. Los monstruos se esconden en ella.',
      storyLine2: 'El fuego es la única salvación. La luz hace retroceder la niebla.',
      storyLine3: 'Tú no estabas allí esa noche — solo los supervivientes.',
      storyLine4: 'Lee lo que vieron. Descubre dónde ardían los fuegos.',
      generatorError: 'El generador no pudo crear un nivel.',
      tutorialNext: 'Sig.',
      tutorialFinish: 'Fin',
      hintGotIt: 'Entendido',
      legendBlack: (rock) => `negro — ${rock}`,
      chapterFallback: (n) => `Capítulo ${n}`,
      tutorialCaption1: 'Toca una casilla para <b>previsualizar</b> un fuego. Es gratis — mantén todos los que quieras mientras piensas.',
      tutorialCaption2: 'Ahora mantén pulsado — o toca dos veces — para <b>encenderlo</b>. Mira cómo se retira la niebla.',
      tutorialCaption3: '¿Cambiaste de idea? Toca un fuego para quitarlo y luego enciéndelo de nuevo.',
      tutorialCaption4: 'Dos líneas de testimonio, una casilla para colocar. Lee ambas, y enciende la que encaje.',
      tutorialCaption5: '<b>Cerca</b> significa las cuatro casillas que tocan un lugar. Las casillas resaltadas son a las que se refiere esta línea; enciende dos fuegos para que una de ellas se quede a oscuras.',
      tutorialCaption6: 'Lo contrario: esta vez enciende ambos fuegos para que <b>las cuatro</b> casillas resaltadas se despejen.',
      tutorialCaption7: '<b>Alrededor</b> es más amplio — las ocho casillas que rodean un lugar, esquinas incluidas. Enciende el único fuego en algún lugar del resaltado.',
      tutorialCaption8: 'Y lo contrario: enciende el fuego <b>fuera</b> de las ocho casillas resaltadas.',
      tutorialCaption9: 'Una más — pero esta vez pulsa <b>Enviar</b> cuando estés listo. ¿Atascado? <b>Pista</b> siempre está ahí, y tres errores solo reinician el nivel.',
      emailPlaceholder: 'tu@ejemplo.com',
      sendLink: 'Enviar enlace',
      signInPrompt: 'Inicia sesión para guardar compras y progreso en cualquier dispositivo.',
      sending: 'Enviando…',
      checkEmail: 'Revisa tu correo para el enlace de acceso.',
      sendFailed: 'No se pudo enviar el enlace. Inténtalo de nuevo en un momento.',
      signedInAsUsername: (name) => `Conectado como <b>${name}</b>`,
      signedInAsEmail: (email) => `Conectado como <b>${email}</b>`,
      usernamePlaceholder: 'elige un usuario',
      saveLabel: 'Guardar',
      usernameTaken: 'Ese usuario ya está en uso.',
      usernameRules: 'Letras, números, guion bajo, 3-20 caracteres.',
      signOut: 'Salir',
    },
  },
  fr: {
    landmark: { C: 'Abri', M: 'Atelier', G: 'Dépôt', S: 'Mémorial', W: 'Pompe' },
    zone: ['Ferraille', 'Boue', 'Décombres', 'Cendres', 'Bosquet', 'Cratère'],
    stage: ['', 'Première Nuit', 'Les Secteurs', 'Signes', 'Témoin Douteux'],
    difficulty: { easy: 'Facile', medium: 'Moyen', hard: 'Difficile', expert: 'Expert' },
    clue: {
      SAFE: (n) => `Le lieu ${n} était en sécurité jusqu'à l'aube.`,
      FOGGED: (n) => `Le lieu ${n} s'est perdu dans la brume — quelque chose était là.`,
      NEAR_MONSTER: (n) => `Un monstre a été vu tout près de ${n}.`,
      NO_MONSTER_NEAR: (n) => `Rien ne s'est approché de ${n} de toute la nuit.`,
      FIRE_BESIDE: (n) => `Un feu brûlait autour de ${n}.`,
      NO_FIRE_BESIDE: (n) => `Aucun feu n'a brûlé autour de ${n}.`,
      ZONE_FOG: (n) => `Il y avait un monstre dans ${n}.`,
      ZONE_CLEAR: (n) => `La zone ${n} est restée dégagée jusqu'à l'aube.`,
      COUNT: (k) => `Exactement ${k} monstres ont été comptés cette nuit-là.`,
      EITHER: (a, b) => `C'était ${a} ou ${b} — je n'arrive pas à m'en souvenir.`,
    },
    ui: {
      title: 'TLS: Pixels of the Mist',
      rule1: (n) => `Vous avez du bois pour <b>${n}</b> feux. Allumez-les en terrain découvert.`,
      rule2: 'Un feu repousse la brume de sa case et des <b>huit autour</b>.',
      rule3: 'Là où la lumière n\'atteint pas, la brume reste — et un monstre avec.',
      rule4: 'Un secteur peut cacher au maximum <b>deux</b> monstres.',
      rule5: 'Un chiffre sur un rocher indique combien de feux le touchent.',
      fuel: 'Bois',
      testimony: 'Témoignages',
      submit: 'Valider',
      reset: 'Effacer',
      reveal: 'Indice',
      newLevel: 'Niveau',
      hintFireHere: 'Un indice : allumez un feu juste ici.',
      hintNoFireHere: 'Un indice : aucun feu ne va ici.',
      hintStaysDark: 'Un indice : cette case reste dans la brume. Un monstre s\'y cache.',
      hintClearsSafe: 'Un indice : cette case est sûre. Pas de monstre ici.',
      hintWhyForcedFog: 'Aucun feu n\'atteint cette case, elle reste donc dans la brume — un monstre est ici.',
      hintWhyOnlySource: 'Une case proche a besoin de lumière, et seul ce feu peut l\'atteindre.',
      hintWhyLastStandingFire: (clue) => `« ${clue} » — toutes les cases voisines sauf celle-ci sont écartées.`,
      hintWhyLastStandingFog: (clue) => `« ${clue} » — toutes les autres cases à portée sont déjà dégagées.`,
      hintWhyFuelSpent: (n) => `Vos ${n} feux sont déjà placés ailleurs — il n'en reste aucun pour ici.`,
      hintWhyFuelForced: 'Il reste autant de cases libres que de feux — allumez-les tous, y compris celui-ci.',
      hintWhyMonsterCountFog: (clue) => `« ${clue} » — cela ne marche que si cette case cache aussi un monstre.`,
      hintWhyMonsterCountClear: (clue) => `« ${clue} » — ce compte est déjà atteint, donc cette case est sûre.`,
      hintWhyScorchFire: 'La trace de brûlure sur ce rocher a encore besoin de ce feu pour compléter le compte.',
      hintWhyScorchNoFire: 'La trace de brûlure sur ce rocher a déjà tout son compte — plus aucun ici.',
      hintWhyDisjoint: 'Des cases sûres proches ont déjà utilisé le reste de vos feux — il n\'en reste aucun pour ici.',
      hintWhyForward: 'L\'inverse ne marche pas — ce ne peut donc être que ceci.',
      hintWrongFireCited: (num, clue) => `Ce feu est faux. Témoignage n° ${num} : « ${clue} »`,
      hintWrongFireBecause: (reason) => `Ce feu est faux : ${reason}`,
      hintWrongFire: 'Ce feu ne correspond pas au témoignage.',
      hintNone: 'Plus d\'indices. Résolvez d\'autres niveaux pour en gagner.',
      hintExhausted: 'Plus d\'indices ici — vous savez déjà tout ce qu\'ils ont vu.',
      hintSolved: 'Plus rien à signaler — ce que vous avez placé est déjà juste. Appuyez sur Valider.',
      hintTap: 'Touchez une case pour <b>prévisualiser</b>. Maintenez pour <b>allumer</b>. Touchez un feu pour le retirer.',
      hintPreview: 'Les aperçus sont gratuits — placez-en autant que voulu.',
      remaining: (n) => `Encore ${n} feu${n === 1 ? '' : 'x'} à placer.`,
      ready: 'Prêt à valider.',
      overloaded: (names) => names.length === 1
        ? `Plus de deux monstres se sont rassemblés dans ${names[0]}.`
        : `Plus de deux monstres se sont rassemblés dans ${names.length} secteurs.`,
      wrong: 'Cela ne correspond pas à ce qu\'ils ont vu.',
      win: 'Tout concorde. L\'abri a tenu jusqu\'à l\'aube.',
      resultWinTitle: 'L\'Aube',
      resultWinBody: 'Tout concorde. L\'abri a tenu jusqu\'à l\'aube.',
      resultLoseTitle: 'Invasion',
      resultLoseBody: 'Trois erreurs, et la brume a englouti l\'abri.',
      resultNext: 'Suivant',
      resultRetry: 'Réessayer',
      resultMenu: 'Menu',
      chapterMapTitle: 'Carte des Chapitres',
      chapterMapHint: 'Chaque secteur génère un nouveau puzzle à chaque fois.',
      lockDev: (name) => `${name} est en cours d'écriture — revenez plus tard.`,
      lockComplete: (name) => `Terminez ${name} pour débloquer ceci.`,
      lockPurchase: (name) => `${name} est un achat unique — achetez pour débloquer.`,
      levelOf: (n, total) => `Niveau ${n} sur ${total}`,
      dailyAgain: 'Le défi du jour est terminé. Revenez demain.',
      endlessLabel: 'Mode Infini',
      endlessLevel: (n) => `Niveau ${n}`,
      dailyLabel: 'Défi Quotidien',
      dailyStreak: (n) => n === 1 ? 'Série : 1 jour' : `Série : ${n} jours`,
      tutorialStepOf: (n, total) => `Étape ${n} sur ${total}`,
      legend: { fire: 'feu', monster: 'monstre',
                border: 'chaque couleur est un secteur', rock: 'décombres, infranchissable' },
      stageLabel: (n, name) => `Phase ${n} — ${name}`,
      seed: 'Graine',
      menuStart: 'Démarrer',
      menuContinue: 'Continuer',
      solvedLabel: (n, total) => `Résolus · ${n}/${total}`,
      chapterMap: 'Chapitres',
      endless: 'Infini',
      daily: 'Quotidien',
      today: 'Auj.',
      howToPlay: 'Comment jouer',
      selectChapter: 'Choisir un Chapitre',
      playTutorial: 'Jouer le Tutoriel',
      htpRule1: 'Touchez une case pour voir un feu.',
      htpRule2: 'Maintenez ou touchez deux fois pour allumer (consomme du bois).',
      htpRule3: 'Un feu dissipe la brume autour de lui.',
      htpRule4: 'Les témoignages vous disent où ne pas chercher.',
      htpRule5: 'Touchez un feu pour l\'annuler.',
      htpRule6: 'Trois erreurs réinitialisent le niveau. Pas d\'autre pénalité.',
      setupTitle: 'Options',
      reduceFlicker: 'Sans scintillement',
      reduceSuddenSounds: 'Réduire les sons soudains',
      music: 'Musique',
      sfx: 'Bruitages',
      ambience: 'Ambiance',
      soon: 'Bientôt',
      language: 'Langue',
      rulesTitle: 'Règles',
      reportSlideLabel: 'Rapport',
      storySlideLabel: 'Histoire',
      setupSlideLabel: 'Options',
      backLabel: 'Retour',
      storyLine1: 'La côte est couverte de brume. Des monstres s\'y cachent.',
      storyLine2: 'Le feu est le seul salut. La lumière repousse la brume.',
      storyLine3: 'Vous n\'étiez pas là cette nuit-là — seuls les survivants y étaient.',
      storyLine4: 'Lisez ce qu\'ils ont vu. Trouvez où les feux ont brûlé.',
      generatorError: 'Le générateur n\'a pas pu créer de niveau.',
      tutorialNext: 'Suivant',
      tutorialFinish: 'Fin',
      hintGotIt: 'Compris',
      legendBlack: (rock) => `noir — ${rock}`,
      chapterFallback: (n) => `Chapitre ${n}`,
      tutorialCaption1: 'Touchez une case pour <b>prévisualiser</b> un feu. C\'est gratuit — placez-en autant que voulu.',
      tutorialCaption2: 'Maintenant, maintenez — ou touchez deux fois — pour <b>l\'allumer</b>. La brume recule.',
      tutorialCaption3: 'Vous avez changé d\'avis ? Touchez un feu pour l\'enlever.',
      tutorialCaption4: 'Deux témoignages, une case. Lisez les deux, puis allumez le feu qui correspond.',
      tutorialCaption5: '<b>Près</b> désigne les quatre cases touchant un lieu (haut, bas, gauche, droite). Allumez deux feux pour qu\'une reste sombre.',
      tutorialCaption6: 'L\'inverse : cette fois, allumez les deux feux pour que les <b>quatre</b> cases soient dégagées.',
      tutorialCaption7: '<b>Autour</b> est plus large — les huit cases, coins inclus. Allumez le feu à l\'intérieur.',
      tutorialCaption8: 'Et l\'inverse : allumez le feu <b>en dehors</b> des huit cases.',
      tutorialCaption9: 'Un dernier — mais cette fois, appuyez sur <b>Valider</b> quand vous êtes prêt. Bloqué ? L\'<b>Indice</b> est toujours là, et trois erreurs réinitialisent simplement le niveau.',
      emailPlaceholder: 'vous@exemple.com',
      sendLink: 'Envoyer le lien',
      signInPrompt: 'Connectez-vous pour sauvegarder votre progression.',
      sending: 'Envoi…',
      checkEmail: 'Vérifiez vos e-mails pour le lien.',
      sendFailed: 'Échec de l\'envoi. Réessayez.',
      signedInAsUsername: (name) => `Connecté en tant que <b>${name}</b>`,
      signedInAsEmail: (email) => `Connecté en tant que <b>${email}</b>`,
      usernamePlaceholder: 'choisir un pseudo',
      saveLabel: 'Sauver',
      usernameTaken: 'Ce pseudo est pris.',
      usernameRules: 'Lettres, chiffres, _, 3-20 caractères.',
      signOut: 'Déconnexion',
    },
  },
  it: {
    landmark: { C: 'Rifugio', M: 'Officina', G: 'Deposito', S: 'Memoriale', W: 'Pompa' },
    zone: ['Rottami', 'Fango', 'Macerie', 'Ceneri', 'Boschetto', 'Cratere'],
    stage: ['', 'Prima Notte', 'I Settori', 'Segni', 'Testimone Dubbio'],
    difficulty: { easy: 'Facile', medium: 'Medio', hard: 'Difficile', expert: 'Esperto' },
    clue: {
      SAFE: (n) => `Il luogo ${n} è rimasto al sicuro fino all'alba.`,
      FOGGED: (n) => `Il luogo ${n} si è perso nella nebbia — c'era qualcosa.`,
      NEAR_MONSTER: (n) => `Un mostro è stato visto molto vicino a ${n}.`,
      NO_MONSTER_NEAR: (n) => `Niente si è avvicinato a ${n} per tutta la notte.`,
      FIRE_BESIDE: (n) => `Un fuoco ardeva attorno a ${n}.`,
      NO_FIRE_BESIDE: (n) => `Nessun fuoco ardeva attorno a ${n}.`,
      ZONE_FOG: (n) => `C'era un mostro in ${n}.`,
      ZONE_CLEAR: (n) => `L'area ${n} è rimasta sgombra fino all'alba.`,
      COUNT: (k) => `Esattamente ${k} mostri sono stati contati quella notte.`,
      EITHER: (a, b) => `Era ${a} o ${b} — non riesco a ricordare.`,
    },
    ui: {
      title: 'TLS: Pixels of the Mist',
      rule1: (n) => `Hai legna per <b>${n}</b> fuochi. Accendi ciascuno in campo aperto.`,
      rule2: 'Un fuoco respinge la nebbia dalla sua casella e dalle <b>otto circostanti</b>.',
      rule3: 'Dove la luce non arriva, la nebbia resta — e con essa un mostro.',
      rule4: 'Un settore può nascondere al massimo <b>due</b> mostri.',
      rule5: 'Un numero su una roccia indica quanti fuochi la toccano.',
      fuel: 'Legna',
      testimony: 'Testimonianze',
      submit: 'Invia',
      reset: 'Azzera',
      reveal: 'Aiuto',
      newLevel: 'Nuovo livello',
      hintFireHere: 'Un indizio: accendi un fuoco proprio qui.',
      hintNoFireHere: 'Un indizio: nessun fuoco va qui.',
      hintStaysDark: 'Un indizio: questa casella resta nella nebbia. C\'è un mostro.',
      hintClearsSafe: 'Un indizio: questa casella è sicura. Nessun mostro qui.',
      hintWhyForcedFog: 'Nessun fuoco raggiunge questa casella, quindi resta nella nebbia — c\'è un mostro qui.',
      hintWhyOnlySource: 'Una casella vicina ha bisogno di luce, e questo è l\'unico fuoco che può raggiungerla.',
      hintWhyLastStandingFire: (clue) => `«${clue}» — tutte le caselle vicine tranne questa sono escluse.`,
      hintWhyLastStandingFog: (clue) => `«${clue}» — tutte le altre caselle a portata sono già sicure.`,
      hintWhyFuelSpent: (n) => `Tutti i tuoi ${n} fuochi sono già piazzati altrove — qui non ne resta nessuno.`,
      hintWhyFuelForced: 'Restano tante caselle libere quanti fuochi hai — accendili tutti, compresa questa.',
      hintWhyMonsterCountFog: (clue) => `«${clue}» — funziona solo se anche questa casella nasconde un mostro.`,
      hintWhyMonsterCountClear: (clue) => `«${clue}» — quel conto è già raggiunto, quindi questa casella è sicura.`,
      hintWhyScorchFire: 'Il segno su quella roccia ha ancora bisogno di questo fuoco per completare il conto.',
      hintWhyScorchNoFire: 'Il segno su quella roccia ha già tutto il fuoco che serve — nessun altro qui.',
      hintWhyDisjoint: 'Alcune caselle sicure vicine hanno già usato il resto dei tuoi fuochi — qui non ne resta nessuno.',
      hintWhyForward: 'Il contrario non funziona — quindi deve essere questo.',
      hintWrongFireCited: (num, clue) => `Quel fuoco è sbagliato. Testimonianza n. ${num}: «${clue}»`,
      hintWrongFireBecause: (reason) => `Quel fuoco è sbagliato: ${reason}`,
      hintWrongFire: 'Quel fuoco non corrisponde alla testimonianza.',
      hintNone: 'Nessun aiuto rimasto. Risolvi altri livelli per ottenerne.',
      hintExhausted: 'Nessun aiuto per questo — sai già tutto ciò che hanno visto.',
      hintSolved: 'Non c\'è altro da segnalare — quello che hai piazzato è già giusto. Premi Invia.',
      hintTap: 'Tocca una casella per <b>vedere</b> un fuoco. Tieni premuto o tocca due volte per <b>accenderlo</b>. Tocca un fuoco per rimuoverlo.',
      hintPreview: 'Le anteprime sono gratis — usane quante ne vuoi.',
      remaining: (n) => `Ancora ${n} fuoc${n === 1 ? 'o' : 'hi'} da piazzare.`,
      ready: 'Pronto per l\'invio.',
      overloaded: (names) => names.length === 1
        ? `Più di due mostri si sono radunati in ${names[0]}.`
        : `Più di due mostri si sono radunati in ${names.length} settori.`,
      wrong: 'Questo non coincide con ciò che hanno visto.',
      win: 'Tutto quadra. Il rifugio ha resistito fino all\'alba.',
      resultWinTitle: 'L\'Alba',
      resultWinBody: 'Tutto quadra. Il rifugio ha resistito fino all\'alba.',
      resultLoseTitle: 'Invasione',
      resultLoseBody: 'Tre errori, e la nebbia ha preso il rifugio.',
      resultNext: 'Prossimo',
      resultRetry: 'Riprova',
      resultMenu: 'Menu',
      chapterMapTitle: 'Mappa Capitoli',
      chapterMapHint: 'Ogni settore genera un nuovo enigma quando ci entri.',
      lockDev: (name) => `${name} è ancora in lavorazione — torna presto.`,
      lockComplete: (name) => `Completa ${name} per sbloccare questo.`,
      lockPurchase: (name) => `${name} richiede un acquisto singolo per essere sbloccato.`,
      levelOf: (n, total) => `Livello ${n} di ${total}`,
      dailyAgain: 'La sfida di oggi è completata. Torna domani.',
      endlessLabel: 'Modalità Infinita',
      endlessLevel: (n) => `Livello ${n}`,
      dailyLabel: 'Sfida Giornaliera',
      dailyStreak: (n) => n === 1 ? 'Serie di 1 giorno' : `Serie di ${n} giorni`,
      tutorialStepOf: (n, total) => `Passo ${n} di ${total}`,
      legend: { fire: 'fuoco', monster: 'mostro',
                border: 'ogni colore è un settore', rock: 'macerie, invalicabile' },
      stageLabel: (n, name) => `Fase ${n} — ${name}`,
      seed: 'Seme',
      menuStart: 'Inizia',
      menuContinue: 'Continua',
      solvedLabel: (n, total) => `Risolti · ${n}/${total}`,
      chapterMap: 'Capitoli',
      endless: 'Infinita',
      daily: 'Giornaliera',
      today: 'Oggi',
      howToPlay: 'Come Giocare',
      selectChapter: 'Scegli Capitolo',
      playTutorial: 'Gioca Tutorial',
      htpRule1: 'Tocca una casella per l\'anteprima.',
      htpRule2: 'Tieni premuto o tocca due volte per accenderlo (costa legna).',
      htpRule3: 'Un fuoco acceso dirada la nebbia.',
      htpRule4: 'Le testimonianze dicono dove non cercare.',
      htpRule5: 'Tocca un fuoco per annullarlo.',
      htpRule6: 'Tre errori resettano il livello. Nessun\'altra penalità.',
      setupTitle: 'Opzioni',
      reduceFlicker: 'Riduci sfarfallio',
      reduceSuddenSounds: 'Riduci suoni improvvisi',
      music: 'Musica',
      sfx: 'Effetti',
      ambience: 'Ambiente',
      soon: 'Presto',
      language: 'Lingua',
      rulesTitle: 'Regole',
      reportSlideLabel: 'Rapporto',
      storySlideLabel: 'Storia',
      setupSlideLabel: 'Opzioni',
      backLabel: 'Indietro',
      storyLine1: 'La costa è coperta di nebbia. I mostri si nascondono dentro.',
      storyLine2: 'Il fuoco è l\'unica salvezza. La luce respinge la nebbia.',
      storyLine3: 'Tu non c\'eri quella notte — solo i sopravvissuti.',
      storyLine4: 'Leggi cosa hanno visto. Trova dove ardevano i fuochi.',
      generatorError: 'Il generatore non ha creato il livello.',
      tutorialNext: 'Avanti',
      tutorialFinish: 'Fine',
      hintGotIt: 'Capito',
      legendBlack: (rock) => `nero — ${rock}`,
      chapterFallback: (n) => `Capitolo ${n}`,
      tutorialCaption1: 'Tocca una casella per <b>vedere</b> un fuoco. È gratis — usane quanti ne vuoi.',
      tutorialCaption2: 'Ora tieni premuto — o tocca due volte — per <b>accenderlo</b>. La nebbia arretra.',
      tutorialCaption3: 'Cambiato idea? Tocca un fuoco acceso per rimuoverlo.',
      tutorialCaption4: 'Due testimonianze, una casella. Leggile, poi accendi il fuoco giusto.',
      tutorialCaption5: '<b>Vicino</b> indica le quattro caselle che toccano un luogo (su, giù, sinistra, destra). Accendi due fuochi affinché una resti buia.',
      tutorialCaption6: 'L\'opposto: accendi entrambi i fuochi in modo che <b>tutte e quattro</b> si schiariscano.',
      tutorialCaption7: '<b>Attorno</b> è più ampio — le otto caselle, angoli inclusi. Accendi il fuoco all\'interno.',
      tutorialCaption8: 'E l\'opposto: accendi il fuoco <b>fuori</b> dalle otto caselle.',
      tutorialCaption9: 'Un altro — ma questa volta premi <b>Invia</b> quando sei pronto. Bloccato? L\'<b>Aiuto</b> è sempre disponibile, e tre errori resettano solo il livello.',
      emailPlaceholder: 'tu@esempio.com',
      sendLink: 'Invia link',
      signInPrompt: 'Accedi per salvare i progressi.',
      sending: 'Invio…',
      checkEmail: 'Controlla l\'email per il link.',
      sendFailed: 'Impossibile inviare. Riprova.',
      signedInAsUsername: (name) => `Connesso come <b>${name}</b>`,
      signedInAsEmail: (email) => `Connesso come <b>${email}</b>`,
      usernamePlaceholder: 'scegli un nome',
      saveLabel: 'Salva',
      usernameTaken: 'Nome già in uso.',
      usernameRules: 'Lettere, numeri, _, 3-20 caratteri.',
      signOut: 'Esci',
    },
  },
  pl: {
    landmark: { C: 'Schron', M: 'Warsztat', G: 'Magazyn', S: 'Pomnik', W: 'Pompa' },
    zone: ['Złomowisko', 'Szlam', 'Gruzy', 'Popielisko', 'Suchy Gaj', 'Krater'],
    stage: ['', 'Pierwsza Noc', 'Sektory', 'Znaki', 'Wątpliwy Świadek'],
    difficulty: { easy: 'Łatwy', medium: 'Średni', hard: 'Trudny', expert: 'Ekspert' },
    clue: {
      SAFE: (n) => `Miejsce ${n} było bezpieczne aż do świtu.`,
      FOGGED: (n) => `Miejsce ${n} zniknęło we mgle — coś tam było.`,
      NEAR_MONSTER: (n) => `Potwora widziano tuż przy ${n}.`,
      NO_MONSTER_NEAR: (n) => `Nic nie zbliżyło się do ${n} przez całą noc.`,
      FIRE_BESIDE: (n) => `Ogień płonął wokół ${n}.`,
      NO_FIRE_BESIDE: (n) => `Żaden ogień nie płonął wokół ${n}.`,
      ZONE_FOG: (n) => `W ${n} znajdował się potwór.`,
      ZONE_CLEAR: (n) => `Strefa ${n} pozostała czysta aż do świtu.`,
      COUNT: (k) => `Tej nocy doliczono się dokładnie ${k} potworów.`,
      EITHER: (a, b) => `To było ${a} albo ${b} — nie pamiętam dokładnie.`,
    },
    ui: {
      title: 'TLS: Pixels of the Mist',
      rule1: (n) => `Masz zapas paliwa na <b>${n}</b> ognisk. Rozpal każde na otwartym terenie.`,
      rule2: 'Ogień odpycha mgłę ze swojego pola i <b>ośmiu wokół niego</b>.',
      rule3: 'Tam, gdzie nie dociera światło, zostaje mgła — a w niej potwór.',
      rule4: 'Sektor może ukryć maksymalnie <b>dwa</b> potwory.',
      rule5: 'Liczba na skale oznacza, ile ognisk jej dotyka.',
      fuel: 'Paliwo',
      testimony: 'Zeznania',
      submit: 'Wyślij',
      reset: 'Wyczyść',
      reveal: 'Podpowiedź',
      newLevel: 'Nowy poziom',
      hintFireHere: 'Podpowiedź: rozpal ogień właśnie tutaj.',
      hintNoFireHere: 'Podpowiedź: tu nie ma ognia — możesz to wykluczyć.',
      hintStaysDark: 'Podpowiedź: to pole zostaje we mgle. Tam jest potwór.',
      hintClearsSafe: 'Podpowiedź: to pole jest bezpieczne. Nie ma tu potwora.',
      hintWhyForcedFog: 'Żaden ogień tu nie dotrze, więc to pole zostaje we mgle — jest tu potwór.',
      hintWhyOnlySource: 'Pobliskie pole potrzebuje światła, a tylko ten ogień może je osiągnąć.',
      hintWhyLastStandingFire: (clue) => `„${clue}” — wszystkie pola obok poza tym są wykluczone.`,
      hintWhyLastStandingFog: (clue) => `„${clue}” — wszystkie inne pola w zasięgu są już bezpieczne.`,
      hintWhyFuelSpent: (n) => `Wszystkie twoje ${n} ognie są już gdzie indziej — tu nic nie zostało.`,
      hintWhyFuelForced: 'Zostało tyle wolnych pól, ile masz ogni — rozpal je wszystkie, także to.',
      hintWhyMonsterCountFog: (clue) => `„${clue}” — to działa tylko wtedy, gdy tu też jest potwór.`,
      hintWhyMonsterCountClear: (clue) => `„${clue}” — ta liczba już się zgadza, więc to pole jest bezpieczne.`,
      hintWhyScorchFire: 'Ślad na tej skale wciąż potrzebuje tego ognia, by liczba się zgadzała.',
      hintWhyScorchNoFire: 'Ślad na tej skale ma już dość ognia — tu więcej nie trzeba.',
      hintWhyDisjoint: 'Pobliskie bezpieczne pola zużyły już resztę twoich ogni — tu nic nie zostało.',
      hintWhyForward: 'Odwrotnie się nie zgadza — więc musi być tak.',
      hintWrongFireCited: (num, clue) => `Ten ogień jest błędny. Zeznanie nr ${num}: „${clue}”`,
      hintWrongFireBecause: (reason) => `Ten ogień jest błędny: ${reason}`,
      hintWrongFire: 'Ten ogień nie zgadza się z zeznaniem.',
      hintNone: 'Brak podpowiedzi. Rozwiąż więcej poziomów, aby je zdobyć.',
      hintExhausted: 'Brak podpowiedzi dla tego poziomu — wiesz już wszystko.',
      hintSolved: 'Nie ma już nic do wskazania — to, co ustawiłeś, jest już poprawne. Kliknij Wyślij.',
      hintTap: 'Stuknij pole, aby <b>zobaczyć</b> ogień. Przytrzymaj, aby <b>rozpalić</b>. Stuknij ogień, aby go cofnąć.',
      hintPreview: 'Podgląd jest darmowy — używaj go ile chcesz.',
      remaining: (n) => `Jeszcze ${n} do rozpalenia.`,
      ready: 'Gotowe do sprawdzenia.',
      overloaded: (names) => names.length === 1
        ? `Więcej niż dwa potwory zebrały się w ${names[0]}.`
        : `Więcej niż dwa potwory zebrały się w ${names.length} sektorach.`,
      wrong: 'To nie zgadza się z zeznaniami.',
      win: 'Wszystko pasuje. Schron przetrwał do świtu.',
      resultWinTitle: 'Świt',
      resultWinBody: 'Wszystko pasuje. Schron przetrwał do świtu.',
      resultLoseTitle: 'Inwazja',
      resultLoseBody: 'Trzy błędy i mgła pochłonęła schron.',
      resultNext: 'Następny',
      resultRetry: 'Powtórz',
      resultMenu: 'Menu',
      chapterMapTitle: 'Mapa Rozdziałów',
      chapterMapHint: 'Każdy sektor to nowa zagadka przy każdym wejściu.',
      lockDev: (name) => `${name} jest wciąż w przygotowaniu — wróć wkrótce.`,
      lockComplete: (name) => `Ukończ ${name}, aby to odblokować.`,
      lockPurchase: (name) => `${name} wymaga jednorazowego zakupu.`,
      levelOf: (n, total) => `Poziom ${n} z ${total}`,
      dailyAgain: 'Dzisiejsze wyzwanie ukończone. Wróć jutro po nowe.',
      endlessLabel: 'Tryb Nieskończony',
      endlessLevel: (n) => `Poziom ${n}`,
      dailyLabel: 'Wyzwanie Dnia',
      dailyStreak: (n) => n === 1 ? 'Seria: 1 dzień' : `Seria: ${n} dni`,
      tutorialStepOf: (n, total) => `Krok ${n} z ${total}`,
      legend: { fire: 'ogień', monster: 'potwór',
                border: 'każdy kolor to sektor', rock: 'gruzy, nieprzejezdne' },
      stageLabel: (n, name) => `Etap ${n} — ${name}`,
      seed: 'Ziarno',
      menuStart: 'Start',
      menuContinue: 'Kontynuuj',
      solvedLabel: (n, total) => `Rozwiązane · ${n}/${total}`,
      chapterMap: 'Rozdział',
      endless: 'Nieskończony',
      daily: 'Codzienne',
      today: 'Dzisiaj',
      howToPlay: 'Jak grać',
      selectChapter: 'Wybierz Rozdział',
      playTutorial: 'Zagraj Samouczek',
      htpRule1: 'Stuknij pole, aby zobaczyć zarys ognia.',
      htpRule2: 'Przytrzymaj lub stuknij dwukrotnie, aby rozpalić (zużywa paliwo).',
      htpRule3: 'Ogień rozprasza mgłę wokół siebie.',
      htpRule4: 'Zeznania mówią, gdzie nie szukać.',
      htpRule5: 'Stuknij ogień, aby go usunąć.',
      htpRule6: 'Trzy błędy resetują poziom. Brak innej kary.',
      setupTitle: 'Opcje',
      reduceFlicker: 'Redukuj migotanie',
      reduceSuddenSounds: 'Redukuj nagłe dźwięki',
      music: 'Muzyka',
      sfx: 'Dźwięki',
      ambience: 'Otoczenie',
      soon: 'Wkrótce',
      language: 'Język',
      rulesTitle: 'Zasady',
      reportSlideLabel: 'Raport',
      storySlideLabel: 'Historia',
      setupSlideLabel: 'Opcje',
      backLabel: 'Wstecz',
      storyLine1: 'Wybrzeże spowija mgła. Kryją się w niej potwory.',
      storyLine2: 'Ogień to jedyny ratunek. Światło odpycha mgłę.',
      storyLine3: 'Nie było cię tamtej nocy — byli tylko ocaleni.',
      storyLine4: 'Przeczytaj co widzieli. Odkryj, gdzie płonęły ogniska.',
      generatorError: 'Generator nie mógł stworzyć poziomu.',
      tutorialNext: 'Dalej',
      tutorialFinish: 'Koniec',
      hintGotIt: 'Rozumiem',
      legendBlack: (rock) => `czarny — ${rock}`,
      chapterFallback: (n) => `Rozdział ${n}`,
      tutorialCaption1: 'Stuknij pole, aby <b>zobaczyć</b> ogień. To darmowe — używaj ile chcesz.',
      tutorialCaption2: 'Teraz przytrzymaj — lub stuknij dwukrotnie — aby go <b>rozpalić</b>. Mgła się cofa.',
      tutorialCaption3: 'Zmiana zdania? Stuknij rozpalony ogień, aby go usunąć.',
      tutorialCaption4: 'Dwa zeznania, jedno pole. Przeczytaj oba i rozpal właściwy ogień.',
      tutorialCaption5: '<b>Przy</b> oznacza cztery pola wokół (góra, dół, lewo, prawo). Rozpal dwa ogniska, aby jedno pole pozostało ciemne.',
      tutorialCaption6: 'Odwrotnie: rozpal oba ogniska, aby <b>wszystkie cztery</b> pola stały się jasne.',
      tutorialCaption7: '<b>Wokół</b> to szerszy obszar — osiem pól, łącznie z rogami. Rozpal ogień wewnątrz.',
      tutorialCaption8: 'I odwrotnie: rozpal ogień <b>poza</b> tymi ośmioma polami.',
      tutorialCaption9: 'Jeszcze jedno — tym razem kliknij <b>Wyślij</b>, gdy będziesz gotowy. Utknąłeś? <b>Podpowiedź</b> jest zawsze dostępna, a trzy błędy po prostu resetują poziom.',
      emailPlaceholder: 'ty@przyklad.pl',
      sendLink: 'Wyślij link',
      signInPrompt: 'Zaloguj się, aby zapisać postępy.',
      sending: 'Wysyłanie…',
      checkEmail: 'Sprawdź e-mail z linkiem.',
      sendFailed: 'Nie udało się wysłać. Spróbuj ponownie.',
      signedInAsUsername: (name) => `Zalogowano jako <b>${name}</b>`,
      signedInAsEmail: (email) => `Zalogowano jako <b>${email}</b>`,
      usernamePlaceholder: 'wybierz nazwę',
      saveLabel: 'Zapisz',
      usernameTaken: 'Ta nazwa jest zajęta.',
      usernameRules: 'Litery, cyfry, _, 3-20 znaków.',
      signOut: 'Wyloguj',
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
