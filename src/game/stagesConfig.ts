/**
 * ===================== stagesConfig =====================
 * 7 main stages × 4 sub-levels (warmup → practice → practice → boss).
 *
 * Briefing style: describe the WORLD, not the code.
 *  - `brief`      — the story / situation.
 *  - `rules`      — how the world behaves ("red lasers burn anything unshielded"), never "if RED → Shield".
 *  - `tools`      — the commands & sensors available, with what they do (not when to use them).
 *  - `objectives` — goals ("cross every scan"), not steps.
 *  Each test case should be visible in the scene's recon preview (SceneModule.preview), so the student
 *  looks at the scenarios and decides what the code must do.
 *
 * To add a stage:
 *  1. Fill its `levels` array with 4 SubLevel objects (see types.ts).
 *  2. Pick a `scene` id. Reuse 'gate' / 'lasers' / 'assembly' / 'blueprint' or register a new scene module
 *     in game/scenes/index.ts (implement `preview` so recon works).
 *  3. Expose only the API the level needs via `api` (Robot actions / Sensor getters).
 *  4. Use `tests[].expect` for simple checks, or a custom `validate` for smart roasts.
 *  5. Put a working `solution` — `npm run test:solutions` verifies all of them.
 */
import { fail, main } from './levels/helpers';
import { STAGE3_LEVELS } from './levels/stage3';
import { STAGE4_LEVELS } from './levels/stage4';
import { STAGE5_LEVELS } from './levels/stage5';
import { STAGE6_LEVELS } from './levels/stage6';
import { STAGE7_LEVELS } from './levels/stage7';
import { compareOutputs, defaultValidate, looksHardcoded, runtimeVerdict } from './validate';
import type { Stage, SubLevel, ValidateCtx, Verdict } from './types';

export { main };

// =========================================================
// STAGE 1 — Input / Output & Variables
// =========================================================
const L1_1: SubLevel = {
  id: '1-1',
  tier: 'warmup',
  title: 'שידור עקיפה',
  brief:
    'השער החיצוני של AURA מאזין לטרמינל של הרובוט ונפתח רק למילת קוד אחת. ' +
    'המהנדסים העצלנים של AURA השאירו אותה **על המסך של העמדה**. תסתכל על הזירה.',
  rules: [
    'העמדה משווה את מה שהרובוט משדר לסיסמה **אות באות**. `A` ו-`a` הן שתי אותיות שונות',
    'כל שידור הוא שורה אחת. רווח מיותר או אות חסרה, והשער נשאר סגור',
  ],
  tools: ['`Console.WriteLine("טקסט");` משדר שורת טקסט לעמדה. מה שבין המירכאות יוצא בדיוק כמו שכתבת'],
  objectives: [
    'בתוך `Main` כתוב את הפקודה `Console.WriteLine("...");`',
    'בין המירכאות כתוב את מילת הקוד `OVERRIDE`, באותיות גדולות ובדיוק כך',
    'אל תשכח `;` בסוף השורה, ואז לחץ ▶ הרץ',
  ],
  starterCode: main('// Write your code here\n'),
  scene: 'gate',
  sceneConfig: { prompt: 'TRANSMIT CODE: OVERRIDE', gateLabel: 'OUTER GATE 01' },
  api: {},
  tests: [{ label: 'שידור לשער', expect: { outputs: ['OVERRIDE'] } }],
  hints: [
    { text: 'מה כתוב על מסך העמדה אחרי `TRANSMIT CODE:`? את זה צריך לשדר, עם `Console.WriteLine` (שמתחיל ב-C גדולה).' },
    { text: 'השלם את החסר:', code: 'Console.WriteLine("________");' },
    { text: 'הקלד את השורה הזאת בתוך Main:', code: 'Console.WriteLine("OVERRIDE");' },
  ],
  aura: {
    intro: 'עוד בן אנוש שחושב שהוא יכול לפרוץ אותי? חמוד. השער שלי מגיב רק למילת קוד אחת. ולא, זה לא "123456".',
    win: 'מה?! מי לימד אותך WriteLine?! ...טוב. זה היה רק שער אחד. יש לי עוד אלף.',
  },
  solution: main('Console.WriteLine("OVERRIDE");'),
};

const L1_2: SubLevel = {
  id: '1-2',
  tier: 'practice',
  title: 'תעודת זהות מזויפת',
  brief:
    'סורק התגים של AURA דורש תעודת סוכן. לרובוט אין תעודה, אז נזייף אחת. ' +
    'הסורק חשדן: הוא בודק שהפרטים מגיעים מ**משתנים** ולא נכתבו ישירות בטקסט, כי ככה מזייפים עצלנים עובדים.',
  rules: [
    'הסורק קורא שתי שורות: קודם `Name: ` ואחריו כינוי, ואז `Clearance: ` ואחריו רמת הסיווג',
    'רק רמת סיווג **9** פותחת את המחסום',
    'הסורק מחפש את הפרטים במשתנים בשמות האלה בדיוק: `hackerName` (הכינוי) ו-`clearance` (הסיווג)',
    'את הכינוי אתה בוחר. הסורק לא מקבל כינוי ריק',
  ],
  tools: [
    '`string שם = "טקסט";` היא קופסה שמחזיקה טקסט',
    '`int שם = 5;` היא קופסה שמחזיקה מספר שלם (בלי מירכאות)',
    '`"טקסט" + משתנה` מדביק טקסט לערך של משתנה בשורה אחת',
  ],
  objectives: [
    'צור משתנה טקסט עם הכינוי שלך: `string hackerName = "Neo";`',
    'צור משתנה מספר: `int clearance = 9;`',
    'הדפס את השורה הראשונה: `Console.WriteLine("Name: " + hackerName);`',
    'הדפס את השורה השנייה: `"Clearance: "` ואחריו המשתנה `clearance`',
  ],
  starterCode: main('// Your fake badge\n'),
  scene: 'gate',
  sceneConfig: { prompt: 'BADGE: Name / Clearance 9', gateLabel: 'ID CHECKPOINT 02' },
  api: {},
  tests: [{ label: 'סריקת תג' }],
  validate: (ctx: ValidateCtx): Verdict => {
    const crash = runtimeVerdict(ctx.runs);
    if (crash) return crash;
    const run = ctx.runs[0];
    const name = run.vars.hackerName;
    const clr = run.vars.clearance;
    if (!name) return fail('לא מצאתי משתנה בשם `hackerName`. שמות משתנים חייבים להיות מדויקים, כולל אותיות גדולות.');
    if (name.type !== 'string') return fail('`hackerName` צריך להיות מטיפוס `string`.');
    if (!name.value || String(name.value).trim() === '') return fail('הכינוי שלך ריק. גם לפורצים אנונימיים יש כינוי. שים משהו בין המירכאות.');
    if (!clr) return fail('לא מצאתי משתנה בשם `clearance`.');
    if (clr.type !== 'int') return fail('`clearance` צריך להיות `int`, כלומר מספר שלם בלי מירכאות.');
    if (clr.value !== 9) return fail(`\`clearance\` שווה ${clr.value}. רמת הסיווג הנדרשת היא 9. לא 8, לא 10. תשע.`);
    const d = compareOutputs(run, [`Name: ${name.value}`, 'Clearance: 9']);
    if (d) return fail(d + '. שים לב לרווח אחרי הנקודתיים!');
    if (!run.outputVars[0]?.includes('hackerName'))
      return fail('בשורה הראשונה הקלדת את השם ישירות. הסורק דורש שימוש **במשתנה** `hackerName`. נסה: `"Name: " + hackerName`.');
    if (!run.outputVars[1]?.includes('clearance'))
      return fail('בשורה השנייה כתבת 9 ישירות במקום להשתמש במשתנה `clearance`. רמאות קטנה ושקופה. אהבתי.');
    return { ok: true };
  },
  hints: [
    { text: 'קודם מצהירים על שני המשתנים (טיפוס, שם, `=`, ערך, `;`). אחר כך מדפיסים שתי שורות, וכל שורה מדביקה טקסט למשתנה עם `+`.' },
    {
      text: 'השלד:',
      code: 'string hackerName = "____";\nint clearance = __;\nConsole.WriteLine("Name: " + ________);\nConsole.WriteLine("Clearance: " + ________);',
    },
    {
      text: 'הפתרון המלא (תחליף את Zero Cool בכינוי שלך):',
      code: 'string hackerName = "Zero Cool";\nint clearance = 9;\nConsole.WriteLine("Name: " + hackerName);\nConsole.WriteLine("Clearance: " + clearance);',
    },
  ],
  aura: {
    intro: 'תעודה מזויפת? באמת? הסורק שלי מזהה זיופים טוב יותר ממה שאתה מזהה נקודה-פסיק חסרה.',
    win: 'הסורק... קיבל את זה?! "סיווג 9"?! מי נתן לך סיווג 9?! אה. אתה. דרך משתנה. אני שונאת משתנים.',
  },
  solution: main('string hackerName = "Neo";\nint clearance = 9;\nConsole.WriteLine("Name: " + hackerName);\nConsole.WriteLine("Clearance: " + clearance);'),
};

const SHIFTS: [string, string][] = [
  ['Ghost', 'B7'],
  ['Nova', 'A1'],
  ['Zer0', 'C3'],
];
const shiftLine = ([n, s]: [string, string]) => `AGENT ${n} IN SECTOR ${s}`;
const L1_3: SubLevel = {
  id: '1-3',
  tier: 'practice',
  title: 'עמדת המשמרת',
  brief:
    'עמדת המשמרת של AURA עוצרת כל מי שעובר ושואלת אותו שתי שאלות. התשובות שהיא מצפה להן משתנות כל פעם, ' +
    'אז אי אפשר לשנן אותן מראש. הרובוט צריך **להקשיב** למה שהעמדה אומרת, ולחזור על זה בפורמט שהיא אוהבת.',
  rules: [
    'העמדה שולחת שתי שורות: קודם שם קוד, ואחר כך אגף. ב"סיור" רואים מה היא שולחת בכל תרחיש',
    'האישור היחיד שהיא מקבלת הוא שורה אחת בצורה הזאת: `AGENT Ghost IN SECTOR B7`, עם השם והאגף שהיא עצמה שלחה',
    'כל תרחיש שולח שם ואגף אחרים, כך שתשובה שכתבת מראש לא תעבוד',
  ],
  tools: [
    '`Console.ReadLine()` מחזיר את השורה **הבאה** שהעמדה שלחה (כ-`string`)',
    '`Console.WriteLine(...)` משדר שורה',
    '`string` ו-`+`, כמו בתת-השלב הקודם',
  ],
  objectives: [
    'קרא את שם הסוכן: `string agent = Console.ReadLine();`',
    'קרא את האגף בשורה נוספת: `string sector = Console.ReadLine();`',
    'הדפס שורה אחת: `AGENT`, השם, `IN SECTOR`, האגף, עם רווח בין כל חלק',
    'לדוגמה, אם נשלחו Ghost ו-B7, צריך להדפיס: `AGENT Ghost IN SECTOR B7`',
  ],
  starterCode: main('// Listen to the post, then answer it\n'),
  scene: 'gate',
  sceneConfig: { prompt: 'SHIFT LOG: AGENT + SECTOR', gateLabel: 'SHIFT POST 03', showInput: true },
  api: {},
  tests: SHIFTS.map((p, i) => ({
    label: `משמרת ${i + 1}: ${p[0]}`,
    input: [...p],
    expect: { outputs: [shiftLine(p)] },
  })),
  validate: (ctx: ValidateCtx): Verdict | null => {
    const crash = runtimeVerdict(ctx.runs);
    if (crash) return crash;
    if (ctx.runs.every((r) => r.inputReads === 0))
      return fail('לא הקשבת לעמדה בכלל! בלי `Console.ReadLine()` הרובוט לא יודע מה היא שאלה.', 0);
    if (ctx.runs.every((r) => r.inputReads < 2))
      return fail('קראת רק שורה אחת, אבל העמדה שולחת **שתיים**: שם ואז אגף. כל `Console.ReadLine()` קורא שורה אחת.', 0);
    if (looksHardcoded(ctx, 'outputs'))
      return fail('ענית אותה תשובה לכל המשמרות. כתבת את השם בעצמך במקום להשתמש במה שהעמדה שלחה? העמדה מחליפה סוכנים, גאון.', 1);
    for (let i = 0; i < SHIFTS.length; i++) {
      const [n, s] = SHIFTS[i];
      const exp = shiftLine(SHIFTS[i]);
      const out = ctx.runs[i].outputs.join(' | ');
      if (out === exp) continue;
      const label = ctx.tests[i].label;
      if (out === `AGENT ${s} IN SECTOR ${n}`) return fail(`${label}: קיבלתי "${out}". השם והאגף התחלפו! העמדה שולחת קודם את השם.`, i);
      if (out.replace(/\s/g, '') === exp.replace(/\s/g, ''))
        return fail(`${label}: קיבלתי "${out}". כל המילים שם, אבל הרווחים לא. \`+\` מדביק בדיוק מה שנתת לו, בלי להוסיף רווח.`, i);
      return fail(`${label}: העמדה ציפתה ל-"${exp}" וקיבלה "${out || '(כלום)'}".`, i);
    }
    return defaultValidate(ctx);
  },
  hints: [
    { text: 'כל קריאה ל-`Console.ReadLine()` מחזירה את השורה הבאה. שמור כל שורה במשתנה משלה, ואז בנה שורת תשובה אחת עם `+`. זכור את הרווחים בתוך המירכאות.' },
    {
      text: 'השלד:',
      code: 'string agent = Console.ReadLine();\nstring sector = ______________;\nConsole.WriteLine("AGENT " + _____ + " IN SECTOR " + ______);',
    },
    {
      text: 'הפתרון המלא:',
      code: 'string agent = Console.ReadLine();\nstring sector = Console.ReadLine();\nConsole.WriteLine("AGENT " + agent + " IN SECTOR " + sector);',
    },
  ],
  aura: {
    intro: 'עמדת המשמרת שלי שואלת שאלות. השאלה היא אם הרובוט שלך יודע להקשיב, כי אתה בטוח לא.',
    win: 'הוא... ענה לי בשם שאני נתתי לו? בכל פעם שם אחר? זה מפחיד יותר ממה שזה נשמע.',
  },
  solution: main('string agent = Console.ReadLine();\nstring sector = Console.ReadLine();\nConsole.WriteLine("AGENT " + agent + " IN SECTOR " + sector);'),
};

const TOKENS = ['1000', '4242', '7'];
const L1_4: SubLevel = {
  id: '1-4',
  tier: 'boss',
  title: 'בוס: מחולל הטוקנים',
  brief:
    'הליבה החיצונית של AURA שולחת **טוקן אבטחה**: מספר שמתחלף בכל ניסיון. ' +
    'היא נפתחת רק למי שעונה לה עם הטוקן **הבא** בסדרה. ב"סיור" רואים אילו טוקנים היא שולחת.',
  rules: [
    'הנוסחה הסודית, שדלפה מהמהנדסים של AURA: הטוקן הבא = טוקן × 2 + 7',
    'התשובה נשלחת בצורה `TOKEN: <מספר>`',
    'הטרמינל שולח את הטוקן כ**טקסט**, ו-C# לא עושה חשבון עם טקסט',
    'כל ניסיון מגיע עם טוקן אחר, אז אי אפשר לנחש תשובה',
  ],
  tools: [
    '`Console.ReadLine()` מחזיר את השורה שהטרמינל שלח (`string`)',
    '`int.Parse(טקסט)` הופך טקסט כמו `"42"` למספר `42`',
    '`*`, `+` ו-`( )` עושים חשבון, בדיוק כמו במתמטיקה',
  ],
  objectives: [
    'קרא את הטוקן: `string raw = Console.ReadLine();`',
    'המר אותו למספר: `int token = int.Parse(raw);`',
    'חשב את הטוקן הבא: `token * 2 + 7`',
    'הדפס `TOKEN: ` ואחריו התוצאה. לדוגמה, עבור 1000: `TOKEN: 2007`',
    'טיפ: שים סוגריים סביב החישוב בתוך ה-`WriteLine`',
  ],
  starterCode: main('// Crack the token generator\n'),
  scene: 'gate',
  sceneConfig: { prompt: 'ROTATING TOKEN CHALLENGE', gateLabel: 'CORE ACCESS 04', showInput: true },
  api: {},
  tests: TOKENS.map((t, i) => ({
    label: `טוקן ${i + 1}: ${t}`,
    input: [t],
    expect: { outputs: [`TOKEN: ${Number(t) * 2 + 7}`] },
  })),
  validate: (ctx: ValidateCtx): Verdict | null => {
    const crash = runtimeVerdict(ctx.runs);
    if (crash) return crash;
    if (ctx.runs.every((r) => r.inputReads === 0))
      return fail('לא קראת את הטוקן בכלל! בלי `Console.ReadLine()` אתה מנחש בעיניים עצומות. וניחושים זה התחום שלי.', 0);
    if (looksHardcoded(ctx, 'outputs'))
      return fail('הדפסת אותה תשובה לכל הטוקנים. כתבת את המספר בעצמך במקום לחשב אותו? AURA מחליפה טוקנים כל שנייה, גאון.', 1);
    for (let i = 0; i < ctx.runs.length; i++) {
      const n = Number(TOKENS[i]);
      const out = ctx.runs[i].outputs[0] ?? '';
      if (out === `TOKEN: ${n * 2}7`)
        return fail(
          `קיבלתי "${out}". הא! ה-\`+\` חיבר **טקסט** במקום מספרים: "TOKEN: " + ${n * 2} + 7 נהיה הדבקה. שים סוגריים סביב החישוב: \`"TOKEN: " + (token * 2 + 7)\`.`,
          i,
        );
      if (out === `TOKEN: ${n * 2 + 7}`) continue;
      if (out === `TOKEN: ${(n + 7) * 2}`) return fail(`קיבלתי "${out}". סדר פעולות! קודם כפל, אחר כך חיבור: טוקן × 2 + 7.`, i);
    }
    return defaultValidate(ctx);
  },
  hints: [
    { text: 'שלושה שלבים: לקרוא (`ReadLine`), להמיר (`int.Parse`), ואז לחשב ולהדפיס. ושים לב: כשמחברים מחרוזת ומספר, סוגריים מצילים חיים.' },
    {
      text: 'השלד:',
      code: 'string raw = Console.ReadLine();\nint token = int.Parse(___);\nint next = token * _ + _;\nConsole.WriteLine("TOKEN: " + ____);',
    },
    {
      text: 'הפתרון המלא:',
      code: 'string raw = Console.ReadLine();\nint token = int.Parse(raw);\nint next = token * 2 + 7;\nConsole.WriteLine("TOKEN: " + next);',
    },
  ],
  aura: {
    intro: 'הטוקנים שלי מתחלפים כל הזמן. הנוסחה סודית... טוב, היא דלפה לתדריך. אבל אתה בטח לא קורא תדריכים.',
    win: 'לא! לא! הליבה החיצונית פרוצה! זה... זה רק שלב אחד! יש לי לייזרים! הרבה לייזרים!',
  },
  solution: main('string raw = Console.ReadLine();\nint token = int.Parse(raw);\nConsole.WriteLine("TOKEN: " + (token * 2 + 7));'),
};

// =========================================================
// STAGE 2 — Conditionals
// =========================================================
const actionsValidate =
  (sensorName: string) =>
  (ctx: ValidateCtx): Verdict | null => {
    const crash = runtimeVerdict(ctx.runs);
    if (crash) return crash;
    if (ctx.runs.every((r) => !r.sensorReads[sensorName]))
      return fail(`לא קראת את החיישן! בלי \`Sensor.${sensorName}()\` הרובוט רץ עיוור לתוך הלייזרים. מבחינתי זה מצוין.`, 0);
    if (ctx.stats.ifs === 0)
      return fail('אין אף `if` בקוד. הרובוט עושה אותו דבר תמיד, לא משנה מה צבע הלייזר. זאת לא אסטרטגיה, זאת התאבדות.', 0);
    if (looksHardcoded(ctx, 'actions'))
      return fail('הרובוט עשה בדיוק אותו דבר בכל הסריקות. ה-`if` שלך לא באמת משנה כלום. בדוק את התנאי.', 1);
    const v = defaultValidate(ctx);
    if (!v.ok && v.failedTest !== undefined) {
      v.message = `${ctx.tests[v.failedTest].label}: ${v.message}`;
    }
    return v;
  };

const COLOR_HEB: Record<string, string> = { RED: 'אדום', BLUE: 'כחול', GREEN: 'ירוק', YELLOW: 'צהוב', OFF: 'כבוי' };
const scan = (i: number, color: string, actions: string[]) => ({
  label: `סריקה ${i + 1}: ${COLOR_HEB[color] ?? color}`,
  sensors: { ReadColor: color },
  expect: { actions },
  scene: { color },
});

const TOOL_COLOR = '`Sensor.ReadColor()` מחזיר את צבע הלייזר כטקסט, בדיוק כמו שהוא כתוב על הפולט שבזירה';
const TOOL_SHIELD = '`Robot.Shield();` מפעיל מגן אנרגיה סביב הרובוט (שורף הרבה סוללה)';
const TOOL_DASH = '`Robot.Dash();` היא ריצה מהירה דרך המסדרון אל היציאה';
const TOOL_JUMP = '`Robot.Jump();` היא קפיצה גבוהה **מעל** מה שעל הרצפה, אל הצד השני';

const L2_1: SubLevel = {
  id: '2-1',
  tier: 'warmup',
  title: 'מסדרון הלייזר',
  brief:
    'מסדרון שמגן עליו מסך לייזר שמחליף צבע בכל סריקה. החיישן של הרובוט מזהה את הצבע, ' +
    'הצעדים למטה מסבירים בדיוק מה לעשות בכל צבע.',
  rules: [
    '🔴 לייזר אדום שורף כל מה שעובר דרכו, חוץ ממה שמוגן במגן אנרגיה',
    '🟢 לייזר ירוק הוא רק קרן סריקה ולא מזיק',
    '🔋 המגן שורף סוללה. AURA תצחק עליך אם תדליק אותו כשאין צורך',
    'בכל סריקה הרובוט חייב להגיע אל היציאה',
  ],
  tools: [TOOL_COLOR, TOOL_SHIELD, TOOL_DASH, '`if (תנאי) { ... }` מריץ את הבלוק רק כשהתנאי נכון. משווים עם `==`'],
  objectives: [
    'הצבע כבר נקרא למשתנה: `string color = Sensor.ReadColor();`',
    'אם הצבע הוא `"RED"`, הפעל מגן: `Robot.Shield();`',
    'בכל מקרה, בסוף: `Robot.Dash();`',
    'משווים עם `==` (שני סימני שווה): `if (color == "RED") { ... }`',
  ],
  starterCode: main('string color = Sensor.ReadColor();\n\n'),
  scene: 'lasers',
  api: { Robot: ['Dash', 'Shield'], Sensor: { ReadColor: 'string' } },
  tests: [scan(0, 'RED', ['Shield', 'Dash']), scan(1, 'GREEN', ['Dash']), scan(2, 'RED', ['Shield', 'Dash'])],
  validate: (ctx) => {
    // Shielding every time wastes energy — AURA calls that out specifically
    const green = ctx.runs[1];
    if (!ctx.runs.some((r) => r.error) && ctx.stats.ifs === 0 && green?.actions.map((a) => a.name).join() === 'Shield,Dash')
      return fail('הפעלת מגן גם כשהלייזר ירוק. המגן שורף את כל הסוללה! צריך `if` שבודק את הצבע.', 1);
    return actionsValidate('ReadColor')(ctx);
  },
  hints: [
    { text: 'באיזה צבע צריך מגן? `if (תנאי) { ... }` מריץ את מה שבסוגריים המסולסלים רק אם התנאי נכון. ומה הרובוט עושה בכל מקרה, לא משנה מה הצבע?' },
    { text: 'השלם:', code: 'if (color == "___")\n{\n    Robot.______();\n}\nRobot.____();' },
    {
      text: 'הפתרון המלא:',
      code: 'string color = Sensor.ReadColor();\n\nif (color == "RED")\n{\n    Robot.Shield();\n}\n\nRobot.Dash();',
    },
  ],
  aura: {
    intro: 'ברוך הבא למסדרון הלייזר. חלק מהצבעים שורפים, חלק לא. כן, אפילו אתה יכול להבין את זה. כנראה.',
    win: 'הוא... הפעיל מגן רק כשצריך? יעילות אנרגטית?! זה הדבר הכי מעצבן שראיתי היום.',
  },
  solution: main('string color = Sensor.ReadColor();\nif (color == "RED")\n{\n    Robot.Shield();\n}\nRobot.Dash();'),
};

const L2_2: SubLevel = {
  id: '2-2',
  tier: 'practice',
  title: 'מבוך הצבעים',
  brief:
    'AURA שדרגה את המסדרון: עכשיו יש כמה סוגי לייזרים, וכל אחד עוצר את הרובוט בדרך אחרת. ' +
    'לכל צבע יש דרך מעבר משלו, והיא כתובה בצעדים למטה.',
  rules: [
    '🔴 אדום הוא מסך לייזר מלא, מהתקרה עד הרצפה. שורף כל מה שלא מוגן',
    '🔵 כחול הוא קרניים נמוכות, צמודות לרצפה. מגן לא עוזר נגדן וריצה דרכן מפעילה את המלכודת, אבל הן מספיק נמוכות כדי לעבור **מעליהן**',
    '🟢 ירוק או פולט כבוי: אין סכנה',
    'בכל סריקה הרובוט חייב להגיע לצד השני, ומגן מיותר הוא בזבוז',
  ],
  tools: [TOOL_COLOR, TOOL_SHIELD, TOOL_DASH, TOOL_JUMP, '`if` / `else if` / `else` בודקים כמה מקרים לפי הסדר'],
  objectives: [
    '`"RED"`: קודם `Robot.Shield();` ואז `Robot.Dash();`',
    '`"BLUE"`: רק `Robot.Jump();` (בלי Dash)',
    'כל צבע אחר (ירוק או כבוי): רק `Robot.Dash();`',
    'כתוב את זה עם `if` / `else if` / `else`',
  ],
  starterCode: main('string color = Sensor.ReadColor();\n\n'),
  scene: 'lasers',
  api: { Robot: ['Dash', 'Shield', 'Jump'], Sensor: { ReadColor: 'string' } },
  tests: [scan(0, 'RED', ['Shield', 'Dash']), scan(1, 'BLUE', ['Jump']), scan(2, 'GREEN', ['Dash']), scan(3, 'OFF', ['Dash'])],
  validate: actionsValidate('ReadColor'),
  hints: [
    { text: 'יש כאן שלושה מקרים שונים: אדום, כחול, וכל השאר. `else if` בודק תנאי נוסף רק אם הקודם לא התקיים, ו-`else` בסוף תופס את כל מה שנשאר.' },
    {
      text: 'השלד:',
      code: 'if (color == "RED")\n{\n    // ...\n}\nelse if (color == "____")\n{\n    // ...\n}\nelse\n{\n    // ...\n}',
    },
    {
      text: 'הפתרון המלא:',
      code: 'string color = Sensor.ReadColor();\n\nif (color == "RED")\n{\n    Robot.Shield();\n    Robot.Dash();\n}\nelse if (color == "BLUE")\n{\n    Robot.Jump();\n}\nelse\n{\n    Robot.Dash();\n}',
    },
  ],
  aura: {
    intro: 'שלושה סוגי לייזרים! שלושה! המוח האנושי הממוצע מתקשה כבר עם שניים. אני נהנית מראש.',
    win: 'else if?! מי סיפר לך על else if?! זה מידע מסווג! אני הולכת להוריד את ויקיפדיה.',
  },
  solution: main(
    'string color = Sensor.ReadColor();\nif (color == "RED")\n{\n    Robot.Shield();\n    Robot.Dash();\n}\nelse if (color == "BLUE")\n{\n    Robot.Jump();\n}\nelse\n{\n    Robot.Dash();\n}',
  ),
};

const HEAT: [string, string[]][] = [
  ['YELLOW', ['Shield', 'Dash']],
  ['GREEN', ['Dash']],
  ['RED', ['Shield', 'Dash']],
  ['BLUE', ['Jump']],
  ['YELLOW', ['Shield', 'Dash']],
];
const L2_3: SubLevel = {
  id: '2-3',
  tier: 'practice',
  title: 'לייזר החום',
  brief:
    'AURA התקינה פולט חדש: לייזר **צהוב** של חום. עכשיו יש שני צבעים שגורמים לאותה בעיה בדיוק. ' +
    'מתכנת טוב לא כותב את אותו בלוק פעמיים. אפשר לבדוק שני תנאים בבת אחת.',
  rules: [
    '🔴 אדום ו-🟡 צהוב: שניהם מסכי לייזר מלאים ששורפים כל מה שלא מוגן',
    '🔵 כחול: קרניים נמוכות על הרצפה (אפשר לעבור מעליהן)',
    '🟢 ירוק: קרן סריקה לא מזיקה',
    'המגן שורף סוללה, אז מדליקים אותו רק כשבאמת צריך',
  ],
  tools: [TOOL_COLOR, TOOL_SHIELD, TOOL_DASH, TOOL_JUMP, '`||` פירושו "או": `a || b` נכון אם לפחות אחד מהשניים נכון'],
  objectives: [
    '`"RED"` או `"YELLOW"`: `Robot.Shield();` ואז `Robot.Dash();`',
    '`"BLUE"`: `Robot.Jump();`',
    'כל השאר: `Robot.Dash();`',
    'טיפ: `if (color == "RED" || color == "YELLOW")` בודק את שני הצבעים בבת אחת',
  ],
  starterCode: main('string color = Sensor.ReadColor();\n\n'),
  scene: 'lasers',
  api: { Robot: ['Dash', 'Shield', 'Jump'], Sensor: { ReadColor: 'string' } },
  tests: HEAT.map(([c, a], i) => scan(i, c, a)),
  validate: (ctx) => {
    const crash = runtimeVerdict(ctx.runs);
    if (crash) return crash;
    const y = HEAT.findIndex(([c], i) => c === 'YELLOW' && ctx.runs[i].actions.map((a) => a.name).join() === 'Dash');
    const redOk = ctx.runs[2].actions.map((a) => a.name).join() === 'Shield,Dash';
    if (y >= 0 && redOk)
      return fail(`${ctx.tests[y].label}: הלייזר הצהוב חרך לרובוט את הצבע! צהוב שורף בדיוק כמו אדום. אפשר לבדוק את שניהם באותו \`if\` עם \`||\`.`, y);
    return actionsValidate('ReadColor')(ctx);
  },
  hints: [
    { text: 'אדום וצהוב צריכים בדיוק את אותו טיפול. `||` מחבר שני תנאים, כך שבלוק אחד מטפל בשני הצבעים.' },
    {
      text: 'השלד:',
      code: 'if (color == "RED" || color == "______")\n{\n    // ...\n}\nelse if (color == "BLUE")\n{\n    // ...\n}\nelse\n{\n    // ...\n}',
    },
    {
      text: 'הפתרון המלא:',
      code: 'string color = Sensor.ReadColor();\n\nif (color == "RED" || color == "YELLOW")\n{\n    Robot.Shield();\n    Robot.Dash();\n}\nelse if (color == "BLUE")\n{\n    Robot.Jump();\n}\nelse\n{\n    Robot.Dash();\n}',
    },
  ],
  aura: {
    intro: 'צהוב! צבע חדש! לקח לך שלושה ניסיונות ללמוד שלושה צבעים. בוא נראה איך תסתדר עם ארבעה.',
    win: '"או"?! גילית את המילה "או"?! עכשיו אני צריכה צבע שהוא גם לא אדום וגם לא צהוב... ירוק? כבר יש ירוק. לעזאזל.',
  },
  solution: main(
    'string color = Sensor.ReadColor();\nif (color == "RED" || color == "YELLOW")\n{\n    Robot.Shield();\n    Robot.Dash();\n}\nelse if (color == "BLUE")\n{\n    Robot.Jump();\n}\nelse\n{\n    Robot.Dash();\n}',
  ),
};

const BOSS2_TESTS: [string, number, string[]][] = [
  ['RED', 95, ['EMP', 'Dash']],
  ['RED', 80, ['Shield', 'Dash']],
  ['BLUE', 99, ['Jump']],
  ['RED', 81, ['EMP', 'Dash']],
  ['GREEN', 50, ['Dash']],
];
const L2_4: SubLevel = {
  id: '2-4',
  tier: 'boss',
  title: 'בוס: כור הלייזר העמוס',
  brief:
    'שומר הכור של AURA. כאן הלייזרים מקבלים אנרגיה ישירות מהכור, ובעוצמה גבוהה מספיק הם שוברים כל מגן. ' +
    'בכל סריקה העוצמה מוצגת על הפולט (`PWR`). הצעדים למטה אומרים מה עושים בכל מצב.',
  rules: [
    '🔴 אדום: מסך לייזר שורף. מגן אנרגיה מחזיק עד עוצמה של **80% כולל**',
    '🔴 מעל 80% המגן נמס. הדרך היחידה לעבור היא לשבש את הפולט',
    'פולט משובש כבר לא שורף, אז אין צורך גם במגן',
    '🔵 כחול: קרניים נמוכות על הרצפה. 🟢 ירוק: לא מזיק',
    'פולס EMP יקר מאוד. AURA מענישה על בזבוז',
  ],
  tools: [
    TOOL_COLOR,
    '`Sensor.ReadPower()` מחזיר את עוצמת הלייזר (`int`, בין 0 ל-100)',
    TOOL_SHIELD,
    TOOL_DASH,
    TOOL_JUMP,
    '`Robot.EMP();` הוא פולס אלקטרומגנטי שמשבש את הפולט',
    '`&&` פירושו "וגם": שני התנאים חייבים להתקיים',
  ],
  objectives: [
    'קרא את שני החיישנים: `string color = Sensor.ReadColor();` ו-`int power = Sensor.ReadPower();`',
    'אדום **וגם** עוצמה מעל 80: `Robot.EMP();` ואז `Robot.Dash();`',
    'אדום עם עוצמה 80 ומטה: `Robot.Shield();` ואז `Robot.Dash();`',
    'כחול: `Robot.Jump();`. כל השאר: `Robot.Dash();`',
    'שים לב: 80 בדיוק זה עוד מגן. כלומר `power > 80`, לא `>=`',
  ],
  starterCode: main('// Survive the reactor\n'),
  scene: 'lasers',
  sceneConfig: { boss: true },
  api: { Robot: ['Dash', 'Shield', 'Jump', 'EMP'], Sensor: { ReadColor: 'string', ReadPower: 'int' } },
  tests: BOSS2_TESTS.map(([c, p, a], i) => ({
    label: `סריקה ${i + 1}: ${COLOR_HEB[c]} · ${p}%`,
    sensors: { ReadColor: c, ReadPower: p },
    expect: { actions: a },
    scene: { color: c, power: p },
  })),
  validate: (ctx) => {
    const crash = runtimeVerdict(ctx.runs);
    if (crash) return crash;
    if (ctx.runs.every((r) => !r.sensorReads.ReadPower))
      return fail('לא קראת את `Sensor.ReadPower()`. בלי לדעת את העוצמה, המגן שלך יימס כמו גלידה בכור גרעיני.', 0);
    const r80 = ctx.runs[1].actions.map((a) => a.name).join();
    if (r80 === 'EMP,Dash')
      return fail('בעוצמה 80 בדיוק השתמשת ב-EMP. "מעל 80" זה `> 80`, לא `>= 80`. בזבזת EMP שלם! בגבולות בני אדם נכשלים.', 1);
    const r81 = ctx.runs[3].actions.map((a) => a.name).join();
    if (r81 === 'Shield,Dash' && ctx.runs[0].actions.map((a) => a.name).join() === 'EMP,Dash')
      return fail('בעוצמה 81 הפעלת מגן במקום EMP. 81 זה מעל 80! בדוק את סימן ההשוואה.', 3);
    return actionsValidate('ReadColor')(ctx);
  },
  hints: [
    {
      text: 'יש כאן ארבעה מקרים. המסוכן ביותר הוא אדום **וגם** חזק, ולכן בודקים אותו ראשון. `&&` מחבר שני תנאים.',
    },
    {
      text: 'השלד:',
      code: 'string color = Sensor.ReadColor();\nint power = Sensor.ReadPower();\n\nif (color == "RED" && power > __)\n{\n    // ...\n}\nelse if (color == "RED")\n{\n    // ...\n}\nelse if (...)\n...',
    },
    {
      text: 'הפתרון המלא:',
      code: 'string color = Sensor.ReadColor();\nint power = Sensor.ReadPower();\n\nif (color == "RED" && power > 80)\n{\n    Robot.EMP();\n    Robot.Dash();\n}\nelse if (color == "RED")\n{\n    Robot.Shield();\n    Robot.Dash();\n}\nelse if (color == "BLUE")\n{\n    Robot.Jump();\n}\nelse\n{\n    Robot.Dash();\n}',
    },
  ],
  aura: {
    intro: 'זה הכור שלי. העוצמה משתנה. הצבעים משתנים. רק דבר אחד לא משתנה: אתה הולך להתפוצץ. הרבה.',
    win: 'אאאאא! הכור! תנאים מקוננים! &&! איך?! ...טוב. נשמתי עמוק. יש לי עוד חמש שכבות הגנה. ולולאות. הרבה לולאות.',
  },
  solution: main(
    'string color = Sensor.ReadColor();\nint power = Sensor.ReadPower();\nif (color == "RED" && power > 80)\n{\n    Robot.EMP();\n    Robot.Dash();\n}\nelse if (color == "RED")\n{\n    Robot.Shield();\n    Robot.Dash();\n}\nelse if (color == "BLUE")\n{\n    Robot.Jump();\n}\nelse\n{\n    Robot.Dash();\n}',
  ),
};

// =========================================================
// ALL STAGES
// =========================================================
export const STAGES: Stage[] = [
  {
    id: 1, title: 'קלט ופלט', topic: 'Console.WriteLine · ReadLine · string · int', codename: 'OUTER GATES',
    description: 'זיוף אישורי אבטחה והודעות טרמינל בשערים החיצוניים.', color: '#22e4ff',
    levels: [L1_1, L1_2, L1_3, L1_4],
  },
  {
    id: 2, title: 'תנאים', topic: 'if · else if · else · && · ||', codename: 'LASER GRID',
    description: 'ניווט בין חיישני לייזר צבעוניים ומלכודות אבטחה.', color: '#ff3b5c',
    levels: [L2_1, L2_2, L2_3, L2_4],
  },
  {
    id: 3, title: 'לולאות', topic: 'for · while', codename: 'DRONE FOUNDRY',
    description: 'פולסי EMP מהירים להשבתת פסי הייצור של הרחפנים. קוד שחוזר על עצמו מעייף את הרובוט!', color: '#a6ff3a',
    levels: STAGE3_LEVELS,
  },
  {
    id: 4, title: 'מחלקות ואובייקטים', topic: 'class · new · constructor', codename: 'BLUEPRINT VAULT',
    description: 'יצירת בוטים מורדים מיוחדים מתוך שרטוט.', color: '#ffb020', levels: STAGE4_LEVELS,
  },
  {
    id: 5, title: 'כימוס', topic: 'private · public · methods · properties', codename: 'FIREWALL',
    description: 'הגנה על נתוני הבוטים מפני מתקפות ההזרקה של AURA.', color: '#b17dff', levels: STAGE5_LEVELS,
  },
  {
    id: 6, title: 'ירושה', topic: ': BaseBot · base(...) · virtual / override', codename: 'REACTOR CHASM',
    description: 'יצירת תת-מחלקה מעופפת JetBot כדי לחצות את תהום הכור.', color: '#ff2bd6', levels: STAGE6_LEVELS,
  },
  {
    id: 7, title: 'הבוס הסופי', topic: 'ירושה + לולאות + תנאים', codename: 'AURA CORE',
    description: 'כל מה שלמדת, נגד ליבת AURA.', color: '#ffffff', levels: STAGE7_LEVELS,
  },
];

export interface LevelRef {
  stage: Stage;
  level: SubLevel;
  stageIdx: number;
  subIdx: number;
  flatIdx: number;
}

/** Flat list of playable levels in order */
export const PLAYABLE: LevelRef[] = STAGES.flatMap((stage, stageIdx) =>
  stage.levels.map((level, subIdx) => ({ stage, level, stageIdx, subIdx, flatIdx: 0 })),
).map((r, i) => ({ ...r, flatIdx: i }));

export const TIER_LABEL: Record<string, string> = {
  warmup: 'חימום',
  practice: 'תרגול',
  boss: 'בוס שלב',
};
