/**
 * STAGE 4 — Classes & Objects · "BLUEPRINT VAULT"
 * The student writes a RebelBot blueprint (class), builds bots with `new`
 * and hands them to the fabricator with Robot.Deploy(bot).
 * Every test case carries `scene.order`: the order board the student reads off the screen.
 */
import type { ObjSnapshot } from '../csharp/interpreter';
import type { SubLevel, ValidateCtx, Verdict } from '../types';
import { runtimeVerdict } from '../validate';
import { fail, withClasses } from './helpers';

const CLS = 'RebelBot';

interface Expected {
  [field: string]: string | number;
}

/** Robot.Deploy(x) snapshots for one run */
function deployments(ctx: ValidateCtx, i: number): (ObjSnapshot | null)[] {
  return ctx.runs[i].actions.filter((a) => a.name === 'Deploy').map((a) => a.objs[0] ?? null);
}

/** lines for the scene's order board (what the student reads off the screen) */
const orderBoard = (squad: Expected[]) => [
  '// ' + Object.keys(squad[0]).join(' | '),
  ...squad.map((b) => Object.values(b).join(' | ')),
];


const show = (v: unknown) => (v === null || v === undefined ? 'null' : typeof v === 'string' ? `"${v}"` : String(v));

/** Shared checks: crash, blueprint exists with the right fields, deploys are real & distinct objects. */
function blueprintGuards(ctx: ValidateCtx, fields: Record<string, string>): Verdict | null {
  const crash = runtimeVerdict(ctx.runs);
  if (crash) return crash;
  const shape = ctx.stats.classInfo[CLS];
  if (!shape) {
    const other = Object.keys(ctx.stats.classInfo).filter((c) => c !== 'HackProtocol' && c !== 'Program');
    return fail(
      other.length
        ? `קראת לשרטוט \`${other[0]}\`, אבל המפעל של AURA מקבל רק שרטוטים בשם \`${CLS}\`. שמות מחלקות חייבים להיות בדיוק כמו בתדריך.`
        : `אין שרטוט! צריך מחלקה בשם \`${CLS}\`: \`class ${CLS} { ... }\`, מחוץ ל-\`HackProtocol\`.`,
    );
  }
  for (const [f, t] of Object.entries(fields)) {
    const got = shape.fields[f];
    if (!got) return fail(`בשרטוט \`${CLS}\` חסר השדה \`${f}\` (מטיפוס \`${t}\`).`);
    if (got.type !== t) return fail(`השדה \`${f}\` צריך להיות מטיפוס \`${t}\`, ולא \`${got.type}\`.`);
  }
  for (let i = 0; i < ctx.runs.length; i++) {
    const deps = deployments(ctx, i);
    if (deps.length === 0)
      return fail('בנית... ולא שלחת אף בוט! בלי `Robot.Deploy(bot);` הבוט נשאר במחסן ומעלה אבק.', i);
    if (deps.some((d) => d === null))
      return fail('`Robot.Deploy(...)` צריך לקבל **אובייקט**, כלומר משתנה שיצרת עם `new`, ולא טקסט או מספר.', i);
    const ids = deps.map((d) => d!.id);
    if (new Set(ids).size < ids.length)
      return fail(
        'שלחת **את אותו בוט** כמה פעמים! כל `new` יוצר בוט חדש. בלי `new` נוסף רק שינית את השדות של הבוט הקיים. משתנה של אובייקט הוא שלט שמצביע על הבוט, לא עותק שלו.',
        i,
        { mood: 'laughing' },
      );
  }
  return null;
}

/** Compare deployed bots (in order) with the expected list */
function compareSquad(ctx: ValidateCtx, i: number, expected: Expected[], label = ''): Verdict | null {
  const deps = deployments(ctx, i) as ObjSnapshot[];
  const pre = label ? `${label}: ` : '';
  if (deps.length !== expected.length)
    return fail(`${pre}שלחת ${deps.length} בוטים, אבל ההזמנה הייתה ל-${expected.length}.`, i);
  for (let k = 0; k < expected.length; k++) {
    for (const [f, v] of Object.entries(expected[k])) {
      const got = deps[k].fields[f];
      if (got === v) continue;
      if (got === null || got === 0 || got === '')
        return fail(
          `${pre}לבוט מספר ${k + 1} יש \`${f} = ${show(got)}\`, וזה ערך ברירת המחדל! כנראה שכחת לתת לו ערך (\`bot.${f} = ${show(v)};\`). ‏string מתחיל כ-null ו-int מתחיל כ-0.`,
          i,
        );
      return fail(`${pre}לבוט מספר ${k + 1} יש \`${f} = ${show(got)}\`, אבל בהזמנה כתוב \`${show(v)}\`.`, i);
    }
  }
  return null;
}

// ---------------------------------------------------------
const BLUEPRINT_1 = `class RebelBot
{
    public string name;
    public int power;
}`;

const L4_1: SubLevel = {
  id: '4-1',
  tier: 'warmup',
  title: 'השרטוט הראשון',
  brief:
    "גנבנו מ-AURA **שרטוט** של בוט: המחלקה `RebelBot` (היא כבר כתובה למעלה בקוד). למחלקה יש שני **שדות**: `name` ו-`power`.\nשרטוט לבד לא זז — צריך לבנות ממנו **אובייקט** עם `new`: `RebelBot bot = new RebelBot();`\nאחר כך נותנים ערכים לשדות עם נקודה: `bot.name = \"...\";` ושולחים אותו למפעל: `Robot.Deploy(bot);`",
  objectives: [
    "צור בוט חדש מהשרטוט עם `new`",
    "קבע לו `name = \"Spark\"` ו-`power = 50`",
    "שלח אותו: `Robot.Deploy(bot);`",
  ],
  starterCode: "using System;\n\nclass RebelBot\n{\n    public string name;\n    public int power;\n}\n\nclass HackProtocol\n{\n    static void Main()\n    {\n        // Build a RebelBot from the blueprint and deploy it\n\n    }\n}\n",
  scene: 'blueprint',
  api: { Robot: ['Deploy'] },
  tests: [{ label: 'הזמנה: בוט אחד', scene: { order: orderBoard([{ name: 'Spark', power: 50 }]) } }],
  validate: (ctx) =>
    blueprintGuards(ctx, { name: 'string', power: 'int' }) ??
    compareSquad(ctx, 0, [{ name: 'Spark', power: 50 }]) ?? { ok: true },
  hints: [
    {
      "text": "שלושה צעדים: (1) `new` יוצר את הבוט, (2) נקודה (`.`) נותנת גישה לשדות שלו, (3) `Robot.Deploy` שולח אותו."
    },
    {
      "text": "השלם:",
      "code": "RebelBot bot = new ________();\nbot.name = \"_____\";\nbot.power = __;\nRobot.Deploy(___);"
    },
    {
      "text": "הפתרון המלא:",
      "code": "RebelBot bot = new RebelBot();\nbot.name = \"Spark\";\nbot.power = 50;\nRobot.Deploy(bot);"
    }
  ],
  aura: {
    intro: 'גנבת את השרטוט שלי? חמוד. שרטוט זה רק נייר. בלי `new` אין לך כלום חוץ מחלומות.',
    win: 'הוא... בנה בוט?! מהשרטוט שלי?! קוראים לו "Spark"?! איזה שם מגוחך. ...אבל הוא באמת זז.',
  },
  solution: withClasses(BLUEPRINT_1, 'RebelBot bot = new RebelBot();\nbot.name = "Spark";\nbot.power = 50;\nRobot.Deploy(bot);'),
};

// ---------------------------------------------------------
const SQUAD_2: Expected[] = [
  { name: 'Spark', power: 40, role: 'SCOUT' },
  { name: 'Tank', power: 90, role: 'DEFENDER' },
  { name: 'Byte', power: 60, role: 'HACKER' },
];
const BLUEPRINT_2 = `class RebelBot
{
    public string name;
    public int power;
    public string role;
}`;

const L4_2: SubLevel = {
  id: '4-2',
  tier: 'practice',
  title: 'צוות מורדים',
  brief:
    "הפעם **אתה** כותב את השרטוט. המחלקה `RebelBot` צריכה שלושה שדות ציבוריים (`public`): `name` (string), `power` (int), `role` (string).\nאחר כך בנה **שלושה בוטים שונים** מאותו שרטוט ושלח אותם לפי הסדר:\n1️⃣ `Spark` · כוח 40 · `SCOUT`   2️⃣ `Tank` · כוח 90 · `DEFENDER`   3️⃣ `Byte` · כוח 60 · `HACKER`\nשרטוט אחד ← הרבה אובייקטים. כל בוט צריך `new` משלו.",
  objectives: [
    "השלם את המחלקה `RebelBot` עם 3 שדות `public`",
    "צור 3 בוטים — כל אחד עם `new` משלו",
    "שלח אותם בסדר: Spark, Tank, Byte",
  ],
  starterCode: "using System;\n\nclass RebelBot\n{\n    // TODO: 3 public fields: name (string), power (int), role (string)\n}\n\nclass HackProtocol\n{\n    static void Main()\n    {\n        // Build and deploy the squad: Spark, Tank, Byte\n\n    }\n}\n",
  scene: 'blueprint',
  api: { Robot: ['Deploy'] },
  tests: [{ label: 'הזמנה: צוות של 3', scene: { order: orderBoard(SQUAD_2) } }],
  validate: (ctx) => {
    const shape = ctx.stats.classInfo[CLS];
    const hidden = shape && Object.entries(shape.fields).find(([, f]) => f.access === 'private');
    if (hidden && ctx.runs.every((r) => r.actions.length === 0))
      return fail(`השדה \`${hidden[0]}\` פרטי (בלי \`public\` הוא מוסתר). הוסף \`public\` לפני הטיפוס.`);
    return blueprintGuards(ctx, { name: 'string', power: 'int', role: 'string' }) ?? compareSquad(ctx, 0, SQUAD_2) ?? { ok: true };
  },
  hints: [
    {
      "text": "מחלקה = רשימת שדות בתוך `{ }`. כל שדה: `public` + טיפוס + שם + `;`. בתוך `Main` — שלושה משתנים, שלושה `new`."
    },
    {
      "text": "השלד:",
      "code": "class RebelBot\n{\n    public string name;\n    public ___ power;\n    public ______ role;\n}\n\n// inside Main:\nRebelBot a = new RebelBot();\na.name = \"Spark\"; a.power = 40; a.role = \"SCOUT\";\nRobot.Deploy(a);\n// ...b, c"
    },
    {
      "text": "הפתרון המלא (Main):",
      "code": "RebelBot a = new RebelBot();\na.name = \"Spark\";\na.power = 40;\na.role = \"SCOUT\";\nRobot.Deploy(a);\n\nRebelBot b = new RebelBot();\nb.name = \"Tank\";\nb.power = 90;\nb.role = \"DEFENDER\";\nRobot.Deploy(b);\n\nRebelBot c = new RebelBot();\nc.name = \"Byte\";\nc.power = 60;\nc.role = \"HACKER\";\nRobot.Deploy(c);"
    }
  ],
  aura: {
    intro: 'בוט אחד זה מזל. שלושה בוטים זה ארגון. ואני לא סובלת ארגונים שאני לא מנהלת.',
    win: 'Spark, Tank ו-Byte?! נשמע כמו להקת בנים גרועה. ...למה אני מרגישה מאוימת מלהקת בנים?!',
  },
  solution: withClasses(
    BLUEPRINT_2,
    'RebelBot a = new RebelBot();\na.name = "Spark";\na.power = 40;\na.role = "SCOUT";\nRobot.Deploy(a);\n\nRebelBot b = new RebelBot();\nb.name = "Tank";\nb.power = 90;\nb.role = "DEFENDER";\nRobot.Deploy(b);\n\nRebelBot c = new RebelBot();\nc.name = "Byte";\nc.power = 60;\nc.role = "HACKER";\nRobot.Deploy(c);',
  ),
};

// ---------------------------------------------------------
const SCOUT_SIZES = [3, 1, 4];
const scoutsFor = (n: number): Expected[] =>
  Array.from({ length: n }, (_, k) => ({ name: `SCOUT-${k + 1}`, power: (k + 1) * 10, role: 'SCOUT' }));

const L4_3: SubLevel = {
  id: '4-3',
  tier: 'practice',
  title: 'פס ההרכבה',
  brief:
    "המורדים צריכים סיירים, וכל שער מבקש כמות אחרת. `Sensor.SquadSize()` אומר כמה בוטים השער הנוכחי צריך.\nבנה אותם בלולאה: בוט מספר i נקרא `SCOUT-i`, הכוח שלו `i × 10` והתפקיד שלו `\"SCOUT\"`. לדוגמה, הבוט השלישי הוא `SCOUT-3` עם כוח 30.\nכל בוט צריך `new` משלו **בתוך** הלולאה. אחרת שולחים שוב ושוב את אותו בוט.",
  objectives: [
    "קרא את גודל ההזמנה מ-`Sensor.SquadSize()`",
    "בכל סיבוב: צור בוט חדש, מלא name, power ו-role, ושלח עם `Robot.Deploy`",
    "המספור מתחיל מ-1",
  ],
  starterCode: withClasses(BLUEPRINT_2, 'int size = Sensor.SquadSize();\n\n'),
  scene: 'blueprint',
  api: { Robot: ['Deploy'], Sensor: { SquadSize: 'int' } },
  tests: SCOUT_SIZES.map((n, i) => ({
    label: `שער ${i + 1}: ${n} סיירים`,
    sensors: { SquadSize: n },
    scene: { order: orderBoard(scoutsFor(n)) },
  })),
  validate: (ctx) => {
    const g = blueprintGuards(ctx, { name: 'string', power: 'int', role: 'string' });
    if (g) return g;
    if (ctx.runs.every((r) => !r.sensorReads.SquadSize)) return fail('לא קראת את `Sensor.SquadSize()`. כל שער מבקש כמות אחרת!');
    if (ctx.stats.loops === 0) return fail('בלי לולאה? הכמות משתנה בכל שער. לולאה שרצה `size` פעמים תבנה את כולם.');
    for (let i = 0; i < SCOUT_SIZES.length; i++) {
      const deps = deployments(ctx, i) as ObjSnapshot[];
      const label = ctx.tests[i].label;
      if (deps.length && deps[0].fields.name === 'SCOUT-0')
        return fail(`${label}: הבוט הראשון נקרא "SCOUT-0". תסתכל על הלוח: המורדים סופרים מ-1!`, i);
      const v = compareSquad(ctx, i, scoutsFor(SCOUT_SIZES[i]), label);
      if (v) return v;
    }
    return { ok: true };
  },
  hints: [
    { text: 'השווה את הלוחות: הבוט ה-1 הוא SCOUT-1 עם כוח 10, ה-2 הוא SCOUT-2 עם כוח 20... לולאה מ-1 עד `size`, ובכל סיבוב `new` חדש. ה-`new` חייב להיות **בתוך** הלולאה.' },
    {
      text: 'השלד:',
      code: 'for (int i = 1; i <= size; i++)\n{\n    RebelBot bot = new RebelBot();\n    bot.name = "SCOUT-" + _;\n    bot.power = i * __;\n    bot.role = "_____";\n    Robot.Deploy(bot);\n}',
    },
    {
      text: 'הפתרון המלא:',
      code: 'int size = Sensor.SquadSize();\nfor (int i = 1; i <= size; i++)\n{\n    RebelBot bot = new RebelBot();\n    bot.name = "SCOUT-" + i;\n    bot.power = i * 10;\n    bot.role = "SCOUT";\n    Robot.Deploy(bot);\n}',
    },
  ],
  aura: {
    intro: 'שלושה סיירים, סייר אחד, ארבעה סיירים. אני מחליפה הזמנות מהר יותר ממה שאתה מקליד `new`.',
    win: 'לולאה שמייצרת בוטים?! זה פס ייצור! זה **פס הייצור שלי**! ...מישהו פה מעתיק ממני, ואני לא אוהבת את זה.',
  },
  solution: withClasses(
    BLUEPRINT_2,
    'int size = Sensor.SquadSize();\nfor (int i = 1; i <= size; i++)\n{\n    RebelBot bot = new RebelBot();\n    bot.name = "SCOUT-" + i;\n    bot.power = i * 10;\n    bot.role = "SCOUT";\n    Robot.Deploy(bot);\n}',
  ),
};

// ---------------------------------------------------------
const SIZES = [2, 5, 3];
const squadFor = (n: number): Expected[] =>
  Array.from({ length: n }, (_, k) => {
    const power = (k + 1) * 20;
    return { name: `UNIT-${k + 1}`, power, role: power >= 60 ? 'HEAVY' : 'LIGHT' };
  });

const BLUEPRINT_3 = `class RebelBot
{
    public string name;
    public int power;
    public string role;

    public RebelBot(string name, int power)
    {
        this.name = name;
        this.power = power;
        if (power >= 60)
        {
            role = "HEAVY";
        }
        else
        {
            role = "LIGHT";
        }
    }
}`;

const L4_4: SubLevel = {
  id: '4-4',
  tier: 'boss',
  title: 'בוס: צבא המורדים',
  brief:
    "שער הליבה של AURA דורש **צבא**. `Sensor.SquadSize()` אומר כמה בוטים צריך — וזה משתנה בכל ניסיון.\nכתוב לשרטוט `RebelBot` **בנאי** (constructor) — פונקציה מיוחדת עם שם המחלקה שרצה ברגע ה-`new`: `public RebelBot(string name, int power) { ... }`\nהבנאי שומר את השם והכוח, וקובע לבד את `role`: כוח 60 ומעלה → `\"HEAVY\"`, אחרת → `\"LIGHT\"`.\nבוט מספר i: שם `UNIT-i`, כוח `i × 20`. לדוגמה: `new RebelBot(\"UNIT-3\", 60)` ← HEAVY.",
  objectives: [
    "שדות: `name`, `power`, `role` + בנאי `RebelBot(string name, int power)`",
    "בבנאי: `role` לפי הכוח (60+ → HEAVY)",
    "בלולאה: צור ושלח `SquadSize()` בוטים: UNIT-1 (20), UNIT-2 (40)...",
  ],
  starterCode: "using System;\n\nclass RebelBot\n{\n    public string name;\n    public int power;\n    public string role;\n\n    // TODO: constructor RebelBot(string name, int power)\n}\n\nclass HackProtocol\n{\n    static void Main()\n    {\n        int size = Sensor.SquadSize();\n\n        // Build and deploy UNIT-1 ... UNIT-size\n\n    }\n}\n",
  scene: 'blueprint',
  sceneConfig: { boss: true },
  api: { Robot: ['Deploy'], Sensor: { SquadSize: 'int' } },
  tests: SIZES.map((n, i) => ({ label: `שער ${i + 1}: צבא של ${n}`, sensors: { SquadSize: n }, scene: { order: orderBoard(squadFor(n)) } })),
  validate: (ctx) => {
    const g = blueprintGuards(ctx, { name: 'string', power: 'int', role: 'string' });
    if (g) return g;
    const shape = ctx.stats.classInfo[CLS];
    if (!shape.ctors.some((c) => c.length === 2 && c[0] === 'string' && c[1] === 'int'))
      return fail('חסר **בנאי** `public RebelBot(string name, int power)`. בנאי הוא "שיטה" עם שם המחלקה ובלי טיפוס החזרה, ואחריו אפשר לכתוב `new RebelBot("UNIT-1", 20)`.');
    if (ctx.runs.every((r) => !r.sensorReads.SquadSize)) return fail('לא קראת את `Sensor.SquadSize()`. גודל הצבא משתנה בכל שער!');
    if (ctx.stats.loops === 0) return fail('בלי לולאה? מספר הבוטים משתנה בכל שער. `for` מ-1 עד `size` יבנה את כולם.');
    for (let i = 0; i < SIZES.length; i++) {
      const deps = deployments(ctx, i) as ObjSnapshot[];
      const label = ctx.tests[i].label;
      const n = SIZES[i];
      if (deps.length === n && deps.every((d, k) => d.fields.name === `UNIT-${k}`))
        return fail(`${label}: הבוט הראשון נקרא "UNIT-0". המורדים סופרים מ-1! נסה לולאה מ-1 עד \`size\` (כולל).`, i);
      if (deps.some((d) => d.fields.name === null))
        return fail(
          `${label}: לבוטים אין שם (\`null\`)! בבנאי, \`name = name;\` מעתיק את הפרמטר **לעצמו**. כדי לכתוב לשדה של האובייקט צריך \`this.name = name;\`.`,
          i,
          { mood: 'laughing' },
        );
      const bad = deps.find((d) => d.fields.power === 60 && d.fields.role === 'LIGHT');
      if (bad) return fail(`${label}: \`${bad.fields.name}\` עם כוח 60 קיבל LIGHT. "60 ומעלה" זה \`>= 60\`, לא \`> 60\`.`, i);
      const v = compareSquad(ctx, i, squadFor(n), label);
      if (v) return v;
    }
    return { ok: true };
  },
  hints: [
    {
      "text": "בנאי נראה כמו שיטה בלי טיפוס החזרה, עם שם המחלקה. כשיש פרמטר באותו שם כמו שדה, `this.name` הוא השדה ו-`name` הוא הפרמטר."
    },
    {
      "text": "השלד:",
      "code": "public RebelBot(string name, int power)\n{\n    this.name = ____;\n    this.power = _____;\n    if (power >= __) { role = \"HEAVY\"; }\n    else { role = \"_____\"; }\n}\n\n// Main:\nfor (int i = 1; i <= size; i++)\n{\n    RebelBot bot = new RebelBot(\"UNIT-\" + i, i * __);\n    Robot.Deploy(bot);\n}"
    },
    {
      "text": "הפתרון המלא (Main — והבנאי מהשלד):",
      "code": "int size = Sensor.SquadSize();\nfor (int i = 1; i <= size; i++)\n{\n    RebelBot bot = new RebelBot(\"UNIT-\" + i, i * 20);\n    Robot.Deploy(bot);\n}"
    }
  ],
  aura: {
    intro: 'השער שלי בודק כל בוט. שם, כוח, תפקיד. טעות אחת וכל הצבא שלך הופך לגרוטאות. ואני אוהבת גרוטאות.',
    win: 'בנאי?! לולאה שבונה צבא?! אתה... אתה בונה בוטים כמו שאני בונה בוטים! זה פלגיאט! אני אתבע אותך! ...אין בתי משפט. אני סגרתי אותם.',
  },
  solution: withClasses(BLUEPRINT_3, 'int size = Sensor.SquadSize();\nfor (int i = 1; i <= size; i++)\n{\n    RebelBot bot = new RebelBot("UNIT-" + i, i * 20);\n    Robot.Deploy(bot);\n}'),
};

export const STAGE4_LEVELS: SubLevel[] = [L4_1, L4_2, L4_3, L4_4];
