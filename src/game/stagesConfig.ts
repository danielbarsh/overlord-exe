/**
 * ===================== stagesConfig =====================
 * 7 main stages × 3 sub-levels (warmup → practice → boss).
 *
 * To add a stage:
 *  1. Fill its `levels` array with 3 SubLevel objects (see types.ts).
 *  2. Pick a `scene` id. Reuse 'gate' / 'lasers' or register a new scene module in
 *     game/scenes/index.ts (e.g. 'assembly' for loops, 'blueprint' for classes).
 *  3. Expose only the API the level needs via `api` (Robot actions / Sensor getters).
 *  4. Use `tests[].expect` for simple checks, or a custom `validate` for smart roasts.
 *  5. Put a working `solution` — `npm run test:solutions` verifies all of them.
 */
import { fail, main } from './levels/helpers';
import { STAGE3_LEVELS } from './levels/stage3';
import { STAGE4_LEVELS } from './levels/stage4';
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
    'השער החיצוני של AURA מאזין לטרמינל של הרובוט. כדי לפתוח אותו צריך לשדר את מילת הקוד **OVERRIDE**.\n' +
    'ב-C# מדפיסים שורה עם הפקודה `Console.WriteLine("...");` — מה שבתוך המירכאות יוצא החוצה בדיוק כמו שכתבת.',
  objectives: ['הדפס בדיוק את המילה `OVERRIDE` (אותיות גדולות!)', 'אל תשכח `;` בסוף הפקודה'],
  starterCode: main('// Write your code here\n'),
  scene: 'gate',
  sceneConfig: { prompt: 'VOICE OVERRIDE REQUIRED', gateLabel: 'OUTER GATE 01' },
  api: {},
  tests: [{ label: 'שידור לשער', expect: { outputs: ['OVERRIDE'] } }],
  hints: [
    { text: 'הפקודה מתחילה ב-`Console` (עם C גדולה!), אחריה נקודה ואז `WriteLine`. הטקסט נכנס בין מירכאות בתוך סוגריים.' },
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
    'סורק התגים של AURA דורש תעודה. נבנה אותה עם **משתנים** — קופסאות עם שם שמחזיקות ערך.\n' +
    '`string` מחזיק טקסט, `int` מחזיק מספר שלם. מחברים טקסט למשתנה עם `+`, למשל: `"Name: " + hackerName`.',
  objectives: [
    'צור משתנה `string hackerName` עם כינוי ההאקר שלך (כל שם שתרצה)',
    'צור משתנה `int clearance` עם הערך `9`',
    'הדפס בשורה הראשונה: `Name: ` ואחריו הכינוי — **באמצעות המשתנה**',
    'הדפס בשורה השנייה: `Clearance: 9` — **באמצעות המשתנה**',
  ],
  starterCode: main('// 1. Create the variables\n\n// 2. Print the badge\n'),
  scene: 'gate',
  sceneConfig: { prompt: 'BADGE SCAN: NAME + CLEARANCE', gateLabel: 'ID CHECKPOINT 02' },
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
    if (clr.type !== 'int') return fail('`clearance` צריך להיות `int` — מספר שלם, בלי מירכאות.');
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
    { text: 'קודם מצהירים: טיפוס, שם, `=`, ערך, `;`. אחר כך מדפיסים עם `+` שמחבר טקסט למשתנה.' },
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

const TOKENS = ['1000', '4242', '7'];
const L1_3: SubLevel = {
  id: '1-3',
  tier: 'boss',
  title: 'בוס: מחולל הטוקנים',
  brief:
    'הטרמינל של AURA שולח **טוקן אבטחה** (מספר) — הרובוט קורא אותו עם `Console.ReadLine()`.\n' +
    'כדי לעבור, צריך לחשב את הטוקן הבא לפי הנוסחה הסודית: **טוקן × 2 + 7** ולהדפיס `TOKEN: ` ואחריו התוצאה.\n' +
    'זהירות: `ReadLine` מחזיר **טקסט**. השער יבדוק את הקוד שלך עם כמה טוקנים שונים — אז אין טעם "לנחש" תשובה.',
  objectives: [
    'קרא את הטוקן מהטרמינל עם `Console.ReadLine()`',
    'המר אותו למספר עם `int.Parse(...)`',
    'חשב טוקן × 2 + 7',
    'הדפס למשל: `TOKEN: 2007` (עבור הטוקן 1000)',
  ],
  starterCode: main('// Read the token, calculate, print\n'),
  scene: 'gate',
  sceneConfig: { prompt: 'ROTATING TOKEN CHALLENGE', gateLabel: 'CORE ACCESS 03', showInput: true },
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
      return fail('לא קראת את הטוקן בכלל! בלי `Console.ReadLine()` אתה מנחש בעיניים עצומות. וניחושים — זה התחום שלי.', 0);
    if (looksHardcoded(ctx, 'outputs'))
      return fail('הדפסת אותה תשובה לכל הטוקנים. כתבת את המספר בעצמך במקום לחשב אותו? AURA מחליפה טוקנים כל שנייה, גאון.', 1);
    for (let i = 0; i < ctx.runs.length; i++) {
      const n = Number(TOKENS[i]);
      const out = ctx.runs[i].outputs[0] ?? '';
      if (out === `TOKEN: ${n * 2}7`)
        return fail(
          `קיבלתי "${out}" — הא! ה-\`+\` חיבר **טקסט** במקום מספרים: "TOKEN: " + ${n * 2} + 7 נהיה הדבקה. שים סוגריים סביב החישוב: \`"TOKEN: " + (token * 2 + 7)\`.`,
          i,
        );
      if (out === `TOKEN: ${n * 2 + 7}`) continue;
      if (out === `TOKEN: ${(n + 7) * 2}`) return fail(`קיבלתי "${out}". סדר פעולות! קודם כפל, אחר כך חיבור: טוקן × 2 + 7.`, i);
    }
    return defaultValidate(ctx);
  },
  hints: [
    { text: 'שלושה שלבים: לקרוא (`ReadLine`), להמיר (`int.Parse`), לחשב ולהדפיס. ושים לב — כשמחברים מחרוזת ומספר, סוגריים מצילים חיים.' },
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
    intro: 'הטוקנים שלי מתחלפים כל הזמן. הנוסחה סודית... טוב, היא כתובה בתדריך. אבל אתה בטח לא קורא תדריכים.',
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

const L2_1: SubLevel = {
  id: '2-1',
  tier: 'warmup',
  title: 'מסדרון הלייזר האדום',
  brief:
    'מסדרון שמגן עליו מסך לייזר. החיישן `Sensor.ReadColor()` מחזיר את צבע הלייזר כטקסט: `"RED"` או `"GREEN"`.\n' +
    'לייזר **אדום** שורף — צריך להפעיל מגן `Robot.Shield();` **לפני** שעוברים. לייזר **ירוק** בטוח.\n' +
    'בכל מקרה, בסוף הרובוט עובר עם `Robot.Dash();`. השתמש ב-`if` ובהשוואה `==`.',
  objectives: ['אם הצבע הוא `"RED"` — הפעל `Robot.Shield();`', 'תמיד בסוף — `Robot.Dash();`', 'השוואה עושים עם `==` (שני סימני שווה!)'],
  starterCode: main('string color = Sensor.ReadColor();\n\n// if the laser is RED -> Robot.Shield();\n\nRobot.Dash();\n'),
  scene: 'lasers',
  api: { Robot: ['Dash', 'Shield'], Sensor: { ReadColor: 'string' } },
  tests: [
    { label: 'סריקה 1: אדום', sensors: { ReadColor: 'RED' }, expect: { actions: ['Shield', 'Dash'] }, scene: { color: 'RED' } },
    { label: 'סריקה 2: ירוק', sensors: { ReadColor: 'GREEN' }, expect: { actions: ['Dash'] }, scene: { color: 'GREEN' } },
    { label: 'סריקה 3: אדום', sensors: { ReadColor: 'RED' }, expect: { actions: ['Shield', 'Dash'] }, scene: { color: 'RED' } },
  ],
  validate: (ctx) => {
    // Shielding every time wastes energy — AURA calls that out specifically
    const green = ctx.runs[1];
    if (!ctx.runs.some((r) => r.error) && ctx.stats.ifs === 0 && green?.actions.map((a) => a.name).join() === 'Shield,Dash')
      return fail('הפעלת מגן גם כשהלייזר ירוק. המגן שורף את כל הסוללה! צריך `if` שבודק את הצבע.', 1);
    return actionsValidate('ReadColor')(ctx);
  },
  hints: [
    { text: '`if (תנאי) { ... }` — מה שבתוך הסוגריים המסולסלים רץ רק אם התנאי נכון. בודקים אם `color` שווה ל-`"RED"`.' },
    { text: 'השלם:', code: 'if (color == "___")\n{\n    Robot.______();\n}' },
    {
      text: 'הפתרון המלא:',
      code: 'string color = Sensor.ReadColor();\n\nif (color == "RED")\n{\n    Robot.Shield();\n}\n\nRobot.Dash();',
    },
  ],
  aura: {
    intro: 'ברוך הבא למסדרון הלייזר. לייזר אדום — שורף. לייזר ירוק — לא שורף. כן, אפילו אתה יכול להבין את זה. כנראה.',
    win: 'הוא... הפעיל מגן רק כשצריך? יעילות אנרגטית?! זה הדבר הכי מעצבן שראיתי היום.',
  },
  solution: main('string color = Sensor.ReadColor();\nif (color == "RED")\n{\n    Robot.Shield();\n}\nRobot.Dash();'),
};

const L2_2: SubLevel = {
  id: '2-2',
  tier: 'practice',
  title: 'מבוך שלושת הצבעים',
  brief:
    'AURA שדרגה את המערכת. עכשיו יש שלושה מצבים:\n' +
    '🔴 `"RED"` — מסך לייזר מלא: `Robot.Shield();` ואז `Robot.Dash();`\n' +
    '🔵 `"BLUE"` — קרני לייזר נמוכות על הרצפה: קופצים מעליהן עם `Robot.Jump();` (בלי Dash!)\n' +
    '⚪ כל מצב אחר — `Robot.Dash();` בלבד.\n' +
    'השתמש ב-`if` / `else if` / `else`.',
  objectives: ['`RED` → Shield ואז Dash', '`BLUE` → Jump בלבד', 'כל השאר (`else`) → Dash בלבד'],
  starterCode: main('string color = Sensor.ReadColor();\n\n'),
  scene: 'lasers',
  api: { Robot: ['Dash', 'Shield', 'Jump'], Sensor: { ReadColor: 'string' } },
  tests: [
    { label: 'סריקה 1: אדום', sensors: { ReadColor: 'RED' }, expect: { actions: ['Shield', 'Dash'] }, scene: { color: 'RED' } },
    { label: 'סריקה 2: כחול', sensors: { ReadColor: 'BLUE' }, expect: { actions: ['Jump'] }, scene: { color: 'BLUE' } },
    { label: 'סריקה 3: ירוק', sensors: { ReadColor: 'GREEN' }, expect: { actions: ['Dash'] }, scene: { color: 'GREEN' } },
    { label: 'סריקה 4: כבוי', sensors: { ReadColor: 'OFF' }, expect: { actions: ['Dash'] }, scene: { color: 'OFF' } },
  ],
  validate: actionsValidate('ReadColor'),
  hints: [
    { text: '`else if` בודק תנאי נוסף רק אם הקודם לא התקיים. `else` בסוף תופס את כל מה שנשאר.' },
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
    intro: 'שלושה צבעים! שלושה! המוח האנושי הממוצע מתקשה כבר עם שניים. אני נהנית מראש.',
    win: 'else if?! מי סיפר לך על else if?! זה מידע מסווג! אני הולכת להוריד את ויקיפדיה.',
  },
  solution: main(
    'string color = Sensor.ReadColor();\nif (color == "RED")\n{\n    Robot.Shield();\n    Robot.Dash();\n}\nelse if (color == "BLUE")\n{\n    Robot.Jump();\n}\nelse\n{\n    Robot.Dash();\n}',
  ),
};

const BOSS2_TESTS: [string, number, string[]][] = [
  ['RED', 95, ['EMP', 'Dash']],
  ['RED', 80, ['Shield', 'Dash']],
  ['BLUE', 99, ['Jump']],
  ['RED', 81, ['EMP', 'Dash']],
  ['GREEN', 50, ['Dash']],
];
const L2_3: SubLevel = {
  id: '2-3',
  tier: 'boss',
  title: 'בוס: כור הלייזר העמוס',
  brief:
    'שומר הכור של AURA. עכשיו יש שני חיישנים: `Sensor.ReadColor()` (טקסט) ו-`Sensor.ReadPower()` (מספר 0–100).\n' +
    '🔴 אדום ועוצמה **מעל 80** — המגן לא יחזיק! צריך לשבש את הפולט עם `Robot.EMP();` ואז `Robot.Dash();`\n' +
    '🔴 אדום ועוצמה **80 ומטה** — `Robot.Shield();` ואז `Robot.Dash();`\n' +
    '🔵 כחול — `Robot.Jump();`\n' +
    '⚪ אחרת — `Robot.Dash();`\n' +
    'רמז מבצעי: `&&` פירושו "וגם". שים לב לגבול — 80 בדיוק זה עוד מגן.',
  objectives: ['קרא את שני החיישנים', 'אדום + עוצמה > 80 → EMP, Dash', 'אדום + עוצמה ≤ 80 → Shield, Dash', 'כחול → Jump  |  אחרת → Dash'],
  starterCode: main('// Read both sensors and survive the reactor\n'),
  scene: 'lasers',
  sceneConfig: { boss: true },
  api: { Robot: ['Dash', 'Shield', 'Jump', 'EMP'], Sensor: { ReadColor: 'string', ReadPower: 'int' } },
  tests: BOSS2_TESTS.map(([c, p, a], i) => ({
    label: `סריקה ${i + 1}: ${({ RED: 'אדום', BLUE: 'כחול', GREEN: 'ירוק' } as Record<string, string>)[c]} · ${p}%`,
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
      return fail('בעוצמה 80 בדיוק השתמשת ב-EMP. "מעל 80" זה `> 80`, לא `>= 80`. בזבזת EMP שלם! הגבולות — המקום שבו בני אדם נכשלים.', 1);
    const r81 = ctx.runs[3].actions.map((a) => a.name).join();
    if (r81 === 'Shield,Dash' && ctx.runs[0].actions.map((a) => a.name).join() === 'EMP,Dash')
      return fail('בעוצמה 81 הפעלת מגן במקום EMP. 81 זה מעל 80! בדוק את סימן ההשוואה.', 3);
    return actionsValidate('ReadColor')(ctx);
  },
  hints: [
    {
      text: 'אפשר לחבר שני תנאים עם `&&` (וגם). סדר חשוב: בדוק קודם את המקרה הכי מסוכן (אדום וחזק).',
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
    intro: 'זה הכור שלי. העוצמה משתנה. הצבעים משתנים. רק דבר אחד לא משתנה — אתה הולך להתפוצץ. הרבה.',
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
    id: 1, title: 'קלט ופלט', topic: 'Console.WriteLine · string · int', codename: 'OUTER GATES',
    description: 'זיוף אישורי אבטחה והודעות טרמינל בשערים החיצוניים.', color: '#22e4ff',
    levels: [L1_1, L1_2, L1_3],
  },
  {
    id: 2, title: 'תנאים', topic: 'if · else if · else · && ', codename: 'LASER GRID',
    description: 'ניווט בין חיישני לייזר צבעוניים ומלכודות אבטחה.', color: '#ff3b5c',
    levels: [L2_1, L2_2, L2_3],
  },
  {
    id: 3, title: 'לולאות', topic: 'for · while', codename: 'DRONE FOUNDRY',
    description: 'פולסי EMP מהירים להשבתת פסי הייצור של הרחפנים. קוד חוזר-על-עצמו מעייף את הרובוט!', color: '#a6ff3a',
    levels: STAGE3_LEVELS,
  },
  {
    id: 4, title: 'מחלקות ואובייקטים', topic: 'class · new', codename: 'BLUEPRINT VAULT',
    description: 'יצירת בוטים מורדים מיוחדים מתוך שרטוט.', color: '#ffb020', levels: STAGE4_LEVELS,
  },
  {
    id: 5, title: 'כימוס', topic: 'private · public · methods', codename: 'FIREWALL',
    description: 'הגנה על נתוני הבוטים מפני מתקפות ההזרקה של AURA.', color: '#b17dff', levels: [],
  },
  {
    id: 6, title: 'ירושה', topic: 'class JetBot : BaseBot', codename: 'REACTOR CHASM',
    description: 'יצירת תת-מחלקה מעופפת JetBot כדי לחצות את תהום הכור.', color: '#ff2bd6', levels: [],
  },
  {
    id: 7, title: 'הבוס הסופי', topic: 'ירושה + לולאות + תנאים', codename: 'AURA CORE',
    description: 'כל מה שלמדת — נגד ליבת AURA.', color: '#ffffff', levels: [],
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
