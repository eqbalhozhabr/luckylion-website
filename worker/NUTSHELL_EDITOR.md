# ویرایشگر «پرونده در یک پوست‌گردو»: سمت سرور

ویرایشگر چیدمان اتاق‌های بازی در `https://luckylion.games/case-in-a-nutshell/editor/` است. کدش در مخزن `eqbalhozhabr/CIAN-Editor` و موتور بازی در `eqbalhozhabr/Case-in-a-Nutshell` است؛ این سند فقط بخشی را می‌گوید که در همین مخزن (Worker سایت) اضافه شد.

## چه چیزی اضافه شد

```
public/case-in-a-nutshell/editor/       صفحه‌ی ویرایشگر و فایل‌های لازمش (خروجی npm run assemble:site در CIAN-Editor)
worker/routes/nutshell-editor.js        ورود، پیش‌نویس، انتشار، کتابخانه‌ی تصویر، و صفحه‌ی ورود
worker/lib/nutshell-auth.js             رمز، کوکی نشست، محدودیت حدس‌زدن
worker/lib/nutshell-validate.js         بررسی سند چیدمان (فقط داده‌ی ساده)
migrations/0006_nutshell_editor.sql     سه جدول: nutshell_layouts، nutshell_library، nutshell_login_attempts
scripts/nutshell-editor-user.mjs        ساخت کاربر و رمز (روی کامپیوتر خودتان)
worker/tests/                           آزمون‌ها و یک سرور محلی
worker/index.js                         چهار خط: مسیرهای /case-in-a-nutshell/ ابتدا به routes/nutshell-editor.js می‌روند
wrangler.jsonc                          یک خط: assets.run_worker_first برای /case-in-a-nutshell/editor
```

بقیه‌ی سایت و بازی‌ها مثل قبل مستقیم از `dist/` سرو می‌شوند و به این کد نمی‌رسند.

## راه‌اندازی یک‌باره

۱. جدول‌ها را روی D1 واقعی بسازید:

```bash
npm run worker:migrate:remote
```

۲. کاربر و رمز را بسازید (روی کامپیوتر خودتان؛ رمز جایی نوشته نمی‌شود، فقط هش نمک‌دار چاپ می‌شود. رمز حداقل ۱۲ حرف، بهتر چند کلمه‌ی تصادفی):

```bash
node scripts/nutshell-editor-user.mjs
```

خروجی دو مقدار دارد. هرکدام را با این دستورها به Cloudflare بدهید (بعد از هر دستور مقدار را بچسبانید):

```bash
npx wrangler secret put EDITOR_USERS
npx wrangler secret put EDITOR_SESSION_SECRET
```

۳. شاخه‌ی `editor-section` را ادغام و سایت را مثل همیشه منتشر کنید.

۴. تا بازیکن‌ها چیدمان منتشرشده را ببینند، بازی در `public/case-in-a-nutshell/` باید با بیلد تازه‌ی مخزن بازی (شاخه‌ای که `src/site/case.html` و `src/engine/layout.js` تازه را دارد) دوباره منتشر شود. بیلد تازه در صفحه‌ی هر پرونده، پیش از خود پرونده، `/case-in-a-nutshell/api/layout/<پرونده>.js` را می‌خواند. اگر چیزی منتشر نشده باشد (یا سرور جواب ندهد) بازی همان چیدمانی را به کار می‌برد که در خودش ساخته شده؛ هیچ‌چیز خراب نمی‌شود.

## کاربر دوم، تغییر رمز، حذف کاربر

- کاربر دوم: `node scripts/nutshell-editor-user.mjs --merge '<JSON فعلی EDITOR_USERS>'` و JSON تازه را دوباره با `wrangler secret put EDITOR_USERS` بگذارید.
- تغییر رمز: همان کار، با همان نام کاربر.
- حذف کاربر: از JSON برش دارید؛ نشست‌های بازش همان لحظه از کار می‌افتند.
- همه را بیرون کردن: `EDITOR_SESSION_SECRET` را عوض کنید.

## چه چیزی با سرور اجرا می‌شود (نه فقط با ظاهر صفحه)

- بدون نشست معتبر، هر درخواست به `/case-in-a-nutshell/editor/...` فقط صفحه‌ی ورود (کد ۴۰۱) می‌گیرد؛ فایل‌های ویرایشگر داده نمی‌شوند. همه‌ی `/case-in-a-nutshell/api/editor/...` هم نشست می‌خواهد.
- هر نوشتن (ذخیره، انتشار، کتابخانه) علاوه بر کوکی هدر `X-Editor: 1` می‌خواهد؛ کوکی `HttpOnly; Secure; SameSite=Strict` است، پس سایت دیگری نمی‌تواند از طرف مرورگر وارد‌شده چیزی بفرستد.
- نشست ۱۲ ساعت می‌ماند و با HMAC امضا می‌شود؛ دست‌کاری‌شده، منقضی یا مربوط به کاربر حذف‌شده رد می‌شود.
- حدس رمز: شش حدس غلط در ۱۵ دقیقه از یک نشانی (و شصت حدس از همه‌ی نشانی‌ها با هم) قفل می‌کند؛ زمان پاسخ برای کاربر ناموجود با کاربر موجود یکی است.
- رمز با PBKDF2-SHA256 و ۱۰۰٬۰۰۰ دور هش می‌شود (بیشترِ مجاز Workers). چون دور کمتر از توصیه‌ی روز است، رمز بلند و محدودیت حدس مهم‌اند. اگر لایه‌ی دوم می‌خواهید، Cloudflare Access را روی همان مسیر هم بگذارید (به این کد کاری ندارد).
- سند چیدمان فقط داده‌ی ساده است: کلیدهای شناخته‌شده، عدد در بازه، رنگ هگز، پیکسل تصویر. چیزی که بیرون این قالب باشد با ۴۲۲ رد می‌شود. بازی هم هنگام بارگذاری قاعده‌های خودش را اجرا می‌کند (پازل و قفل فقط جابه‌جا و بچرخند)، پس چیدمان نمی‌تواند مکانیک بازی را عوض کند.
- نقطه‌ی عمومی `/case-in-a-nutshell/api/layout/<پرونده>.js` فقط آخرین نسخه‌ی **منتشرشده** را می‌دهد، با `nosniff`؛ پیش‌نویس هرگز عمومی نیست.

## مسیرها

```
POST /case-in-a-nutshell/api/editor/login | logout          GET .../me
GET  /case-in-a-nutshell/api/editor/layout/<slug>           پیش‌نویس و نسخه‌ی منتشرشده و فهرست نسخه‌ها
PUT  /case-in-a-nutshell/api/editor/layout/<slug>/draft     (۲۵ پیش‌نویس آخر نگه داشته می‌شود)
POST /case-in-a-nutshell/api/editor/layout/<slug>/publish   (هر نسخه‌ی منتشرشده برای همیشه می‌ماند)
GET  /case-in-a-nutshell/api/editor/layout/<slug>/version/<id>
GET  /case-in-a-nutshell/api/editor/library  و  PUT | DELETE .../library/<id>
GET  /case-in-a-nutshell/api/layout/<slug>.js | .json       عمومی: چیدمان منتشرشده
```

## آزمون و اجرای محلی

```bash
npm run test:nutshell-editor                         # آزمون‌های Worker (نیاز: Node 22)
node worker/tests/local-server.mjs path/to/dist 8788   # سرور محلی با پایگاه‌داده‌ی حافظه‌ای؛ کاربر و رمز را چاپ می‌کند
```

آزمون کامل با مرورگر در مخزن CIAN-Editor است (`npm run test:server`). Worker با خود `wrangler dev --local` و D1 محلی هم امتحان شد: ورود، قفل پس از حدس غلط، سرو فایل با نشست، ذخیره و انتشار.
