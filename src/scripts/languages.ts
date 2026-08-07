/**
 * Card languages.
 *
 * Honesty contract, inherited from the workforce's translator.py: a machine
 * translation of scripture is NOT an authorised rendering, so every card
 * carrying one says so in its own language. The disclaimer is a fixed string
 * appended IN CODE at render time — never model-written, never optional.
 *
 * A passage may be translated two ways:
 *   • by the card maker, pasting their own or an authorised rendering
 *     → prints `unofficial`
 *   • by the AI translator behind /api/translate
 *     → prints `aiDisclaimer`
 *
 * The card's OWN words — reflection question, writing prompt, share line —
 * are Peace Antz's text and ship translated here. The Spanish strings and the
 * es/zh/ar AI disclaimers came from the workforce, where they were
 * human-written and render-verified; the rest were drafted for this site and
 * are marked `reviewed: false` until a native speaker checks them.
 */

export interface LanguageDef {
  code: string;
  name: string;
  nativeName: string;
  rtl: boolean;
  /** Canvas font stack; falls back to whatever the device has for the script. */
  fontSans: string;
  fontSerif: string;
  /** Printed on the card when the passage is a user-supplied translation. */
  unofficial: string;
  /** Printed instead when the translation came from the AI translator. */
  aiDisclaimer: string;
  /** The translation must contain this script, or it did not translate. */
  scriptCheck: RegExp | null;
  quote: { question: string; action: string; share: string };
  prayer: { question: string; action: string; share: string };
  /** Has a native speaker checked these strings? */
  reviewed: boolean;
}

const LATIN_SANS = "'Inter Variable', system-ui, -apple-system, 'Segoe UI', sans-serif";
const LATIN_SERIF = "'Cormorant Garamond Variable', Georgia, 'Times New Roman', serif";
const CJK =
  "'Noto Sans SC', 'Microsoft YaHei', 'PingFang SC', 'Hiragino Sans GB', SimSun, sans-serif";
const ARABIC =
  "'Noto Naskh Arabic', 'Segoe UI', 'Traditional Arabic', Tahoma, 'Times New Roman', serif";

export const LANGUAGES: LanguageDef[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    rtl: false,
    fontSans: LATIN_SANS,
    fontSerif: LATIN_SERIF,
    unofficial: 'Unofficial translation',
    aiDisclaimer: 'Unofficial translation',
    scriptCheck: null,
    quote: {
      question: 'What is one way I can practice this today?',
      action: 'One small action I will try:',
      share: 'If this card speaks to you, pass it on to someone.',
    },
    prayer: {
      question: 'Who would I like to hold in my prayers today?',
      action: 'A name, or an intention:',
      share: 'If this prayer speaks to you, pass it on to someone.',
    },
    reviewed: true,
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    rtl: false,
    fontSans: LATIN_SANS,
    fontSerif: LATIN_SERIF,
    unofficial: 'Traducción no oficial',
    aiDisclaimer: 'Traducción asistida por IA · no es una traducción oficial',
    scriptCheck: null,
    quote: {
      question: '¿De qué manera puedo poner esto en práctica hoy?',
      action: 'Una pequeña acción que intentaré:',
      share: 'Si esta tarjeta te habla al corazón, compártela con alguien.',
    },
    prayer: {
      question: '¿A quién quisiera tener presente en mis oraciones hoy?',
      action: 'Un nombre, o una intención:',
      share: 'Si esta oración te habla al corazón, compártela con alguien.',
    },
    reviewed: true,
  },
  {
    code: 'tl',
    name: 'Tagalog',
    nativeName: 'Tagalog',
    rtl: false,
    fontSans: LATIN_SANS,
    fontSerif: LATIN_SERIF,
    unofficial: 'Hindi opisyal na salin',
    aiDisclaimer: 'Salin sa tulong ng AI · hindi opisyal na salin',
    scriptCheck: null,
    quote: {
      question: 'Paano ko ito maisasabuhay ngayon?',
      action: 'Isang maliit na hakbang na susubukan ko:',
      share: 'Kung nagustuhan mo ang kartang ito, ipasa mo sa iba.',
    },
    prayer: {
      question: 'Sino ang nais kong ipanalangin ngayon?',
      action: 'Isang pangalan, o isang layunin:',
      share: 'Kung nagustuhan mo ang panalanging ito, ipasa mo sa iba.',
    },
    reviewed: false,
  },
  {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    rtl: false,
    fontSans: CJK,
    fontSerif: CJK,
    unofficial: '非官方译本',
    aiDisclaimer: '人工智能辅助翻译 · 非官方译本',
    scriptCheck: /[一-鿿]/,
    quote: {
      question: '今天我可以如何实践这一点？',
      action: '我将尝试的一个小行动：',
      share: '如果这张卡片触动了你，请传递给他人。',
    },
    prayer: {
      question: '今天我想为谁祈祷？',
      action: '一个名字，或一个心愿：',
      share: '如果这段祈祷文触动了你，请传递给他人。',
    },
    reviewed: false,
  },
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    rtl: true,
    fontSans: ARABIC,
    fontSerif: ARABIC,
    unofficial: 'ترجمة غير رسمية',
    aiDisclaimer: 'ترجمة بمساعدة الذكاء الاصطناعي · غير رسمية',
    scriptCheck: /[؀-ۿ]/,
    quote: {
      question: 'كيف يمكنني أن أطبّق هذا اليوم؟',
      action: 'خطوة صغيرة سأحاول القيام بها:',
      share: 'إن لامست هذه البطاقة قلبك، فامنحها لشخص آخر.',
    },
    prayer: {
      question: 'مَن أودّ أن أذكره في دعائي اليوم؟',
      action: 'اسم، أو نيّة:',
      share: 'إن لامس هذا الدعاء قلبك، فامنحه لشخص آخر.',
    },
    reviewed: false,
  },
  {
    code: 'fa',
    name: 'Persian',
    nativeName: 'فارسی',
    rtl: true,
    fontSans: ARABIC,
    fontSerif: ARABIC,
    unofficial: 'ترجمهٔ غیررسمی',
    aiDisclaimer: 'ترجمه با کمک هوش مصنوعی · غیررسمی',
    scriptCheck: /[؀-ۿ]/,
    quote: {
      question: 'امروز چگونه می‌توانم این را به کار ببندم؟',
      action: 'یک اقدام کوچک که انجام خواهم داد:',
      share: 'اگر این کارت بر دل شما نشست، آن را به دیگری بسپارید.',
    },
    prayer: {
      question: 'امروز دوست دارم چه کسی را در دعای خود یاد کنم؟',
      action: 'یک نام، یا یک نیّت:',
      share: 'اگر این دعا بر دل شما نشست، آن را به دیگری بسپارید.',
    },
    reviewed: false,
  },
];

export const byCode = (code: string): LanguageDef =>
  LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];
