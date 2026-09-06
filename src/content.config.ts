import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// هر فایلِ .md توی src/content/blog/ یه پستِ بلاگه. فعلاً همه‌شون از پیجِ
// لینکداینِ شرکت وارد شدن (import اولیه — رجوع کن به توضیحاتِ بالایِ خودِ
// فایل‌ها)؛ پست‌های بعدی تا وقتی دسترسیِ LinkedIn API تأیید بشه و یه
// ورک‌فلوی n8n جایگزینش بشه، دستی (با همین schema) اضافه می‌شن.
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    // تاریخِ واقعیِ پست‌های وارد‌شده از لینکداین تقریبیه — لینکداین فقط
    // زمانِ نسبی («2d»، «1w») نشون می‌ده، نه تاریخِ دقیق.
    pubDate: z.coerce.date(),
    excerpt: z.string(),
    tags: z.array(z.string()).default([]),
    // لینکِ برگشت به پستِ اصلیِ لینکداین، اگه از اونجا اومده باشه.
    sourceUrl: z.string().url().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
