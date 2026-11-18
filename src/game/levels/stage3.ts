/**
 * STAGE 3 — Loops (for / while) · "DRONE FOUNDRY"
 * The robot fires EMP pulses at drones on an assembly line.
 * Copy-pasting Robot.EMP() makes the robot *exhausted* (verdict.tag = 'exhausted').
 */
import type { SubLevel, ValidateCtx, Verdict } from '../types';
import { compareOutputs, defaultValidate, looksHardcoded, runtimeVerdict } from '../validate';
import { fail, main } from './helpers';

const API_EMP = { Robot: ['EMP'] };
const times = (n: number, a: string) => Array.from({ length: n }, () => a);
const empCount = (ctx: ValidateCtx, i: number) => ctx.runs[i].actions.filter((a) => a.name === 'EMP').length;

/** Shared loop-stage guards: crashes, copy-paste ("exhausted"), and "no loop at all". */
function loopGuards(ctx: ValidateCtx, maxEmpCallSites: number): Verdict | null {
  const crash = runtimeVerdict(ctx.runs);
  if (crash) return crash;
  const sites = ctx.stats.calls['Robot.EMP'] ?? 0;
  if (sites > maxEmpCallSites) {
    return fail(
      `כתבת \`Robot.EMP();\` ${sites} פעמים בקוד. הרובוט שלך **מותש** מפקודות חוזרות! מתכנתים אמיתיים לא מעתיקים ומדביקים. הם כותבים לולאה אחת שחוזרת על הפקודה.`,
      0,
      { tag: 'exhausted', mood: 'laughing' },
    );
  }
  if (ctx.stats.loops === 0) {
    return fail('אין אף לולאה בקוד! השכבה הזאת נקראת "לולאות", ויש לזה סיבה. נסה `for` או `while`.', 0);
  }
  return null;
}

function countMsg(got: number, exp: number): string {
  if (got === exp + 1)
    return `ירית ${got} פולסים אבל היו רק ${exp} רחפנים, אחד יותר מדי! בדוק את התנאי בלולאה: \`<\` או \`<=\`? זאת שגיאת "off-by-one", הקלאסיקה של כל לולאה.`;
  if (got === exp - 1)
    return `ירית ${got} פולסים אבל היו ${exp} רחפנים, חסר אחד! בדוק מאיפה הלולאה מתחילה ואיפה היא נעצרת (\`<\` מול \`<=\`).`;
  if (got === 0) return 'לא ירית אף פולס. הלולאה רצה 0 פעמים? בדוק את התנאי שלה.';
  return `ירית ${got} פולסים, אבל היו ${exp} רחפנים על הפס.`;
}


// ---------------------------------------------------------
const L3_1: SubLevel = {
  id: '3-1',
  tier: 'warmup',
  title: 'פולס אחרי פולס',
  brief:
    "ברוכים הבאים למפעל הרחפנים של AURA. על הפס יש **5 רחפנים**, וכל אחד צריך פולס EMP אחד: `Robot.EMP();`.\nאפשר לכתוב את הפקודה 5 פעמים... אבל הרובוט **מתעייף** מפקודות שחוזרות על עצמן. במקום זה, השתמש בלולאת `for` שחוזרת 5 פעמים.\nמבנה הלולאה: `for (int i = 0; i < 5; i++) { ... }` — התחלה; תנאי; קידום.",
  objectives: [
    "ירה בדיוק 5 פולסים",
    "השתמש בלולאת `for`",
    "כתוב `Robot.EMP();` **פעם אחת בלבד** בקוד",
  ],
  starterCode: "using System;\n\nclass HackProtocol\n{\n    static void Main()\n    {\n        // Fire 5 EMP pulses - using a for loop!\n\n    }\n}\n",
  scene: 'assembly',
  api: API_EMP,
  tests: [{ label: 'פס ייצור: 5 רחפנים', expect: { actions: times(5, 'EMP') }, scene: { drones: times(5, 'SCOUT') } }],
  validate: (ctx) => {
    const g = loopGuards(ctx, 1);
    if (g) return g;
    const n = empCount(ctx, 0);
    if (n !== 5) return fail(countMsg(n, 5), 0);
    return defaultValidate(ctx);
  },
  hints: [
    {
      "text": "ללולאת `for` יש שלושה חלקים בתוך הסוגריים, מופרדים ב-`;`: איפה מתחילים (`int i = 0`), עד מתי ממשיכים (`i < 5`), ומה עושים אחרי כל סיבוב (`i++`)."
    },
    {
      "text": "השלם:",
      "code": "for (int i = 0; i < __; i++)\n{\n    Robot.___();\n}"
    },
    {
      "text": "הפתרון המלא:",
      "code": "for (int i = 0; i < 5; i++)\n{\n    Robot.EMP();\n}"
    }
  ],
  aura: {
    intro: 'המפעל שלי מייצר רחפן כל 3 שניות. אתה כותב שורת קוד כל 3 דקות. אני לא דואגת.',
    win: 'לולאה?! הוא כתב פקודה אחת והיא רצה חמש פעמים?! זה... זה בדיוק מה שאני עושה! תפסיק לחקות אותי!',
  },
  solution: main('for (int i = 0; i < 5; i++)\n{\n    Robot.EMP();\n}'),
};

// ---------------------------------------------------------
const COUNTS = [3, 7, 12];
const L3_2: SubLevel = {
  id: '3-2',
  tier: 'practice',
  title: 'ספירת רחפנים',
  brief:
    "AURA משנה כל פעם את מספר הרחפנים על הפס. החיישן `Sensor.CountDrones()` מחזיר כמה רחפנים יש עכשיו (`int`).\nלכל רחפן: ירה `Robot.EMP();` ומיד אחר כך דווח בטרמינל `DRONE 1 DOWN`, `DRONE 2 DOWN` וכן הלאה — **המספור מתחיל מ-1**.\nהשתמש במשתנה הלולאה (`i`) כדי לדעת את מספר הרחפן.",
  objectives: [
    "קרא את מספר הרחפנים מ-`Sensor.CountDrones()`",
    "ירה פולס אחד לכל רחפן — לא יותר, לא פחות",
    "אחרי כל פולס הדפס `DRONE <מספר> DOWN`, החל מ-1",
  ],
  starterCode: "using System;\n\nclass HackProtocol\n{\n    static void Main()\n    {\n        int count = Sensor.CountDrones();\n\n        // For each drone: Robot.EMP(); then print \"DRONE <number> DOWN\"\n\n    }\n}\n",
  scene: 'assembly',
  api: { Robot: ['EMP'], Sensor: { CountDrones: 'int' } },
  tests: COUNTS.map((n, i) => ({
    label: `פס ${i + 1}: ${n} רחפנים`,
    sensors: { CountDrones: n },
    expect: { actions: times(n, 'EMP'), outputs: Array.from({ length: n }, (_, k) => `DRONE ${k + 1} DOWN`) },
    scene: { drones: times(n, 'SCOUT') },
  })),
  validate: (ctx) => {
    const g = loopGuards(ctx, 1);
    if (g) return g;
    if (ctx.runs.every((r) => !r.sensorReads.CountDrones))
      return fail('לא קראת את `Sensor.CountDrones()`. אתה יורה בעיניים עצומות, ומספר הרחפנים משתנה כל פעם!', 0);
    if (looksHardcoded(ctx, 'actions'))
      return fail('ירית אותו מספר פולסים בכל הפסים. כנראה כתבת מספר קבוע בלולאה במקום להשתמש ב-`count`.', 1);
    for (let i = 0; i < COUNTS.length; i++) {
      const n = empCount(ctx, i);
      if (n !== COUNTS[i]) return fail(`${ctx.tests[i].label}: ${countMsg(n, COUNTS[i])}`, i);
      const outs = ctx.runs[i].outputs;
      if (outs.length === COUNTS[i] && outs.every((o, k) => o.trim() === `DRONE ${k} DOWN`))
        return fail('המספור שלך מתחיל מ-0 ("DRONE 0 DOWN"). המחשב סופר מ-0, אבל בני אדם (אפילו אתם) סופרים מ-1. נסה `i + 1` או לולאה שמתחילה מ-1.', i);
      const d = compareOutputs(ctx.runs[i], ctx.tests[i].expect!.outputs!);
      if (d) return fail(`${ctx.tests[i].label}: ${d}`, i);
    }
    return defaultValidate(ctx);
  },
  hints: [
    {
      "text": "במקום מספר קבוע בתנאי הלולאה, השתמש במשתנה `count`. ואת המספר של הרחפן אפשר להדפיס בעזרת המשתנה `i`."
    },
    {
      "text": "השלד:",
      "code": "for (int i = 1; i <= _____; i++)\n{\n    Robot.EMP();\n    Console.WriteLine(\"DRONE \" + _ + \" DOWN\");\n}"
    },
    {
      "text": "הפתרון המלא:",
      "code": "int count = Sensor.CountDrones();\nfor (int i = 1; i <= count; i++)\n{\n    Robot.EMP();\n    Console.WriteLine(\"DRONE \" + i + \" DOWN\");\n}"
    }
  ],
  aura: {
    intro: 'עכשיו אני מחליפה את מספר הרחפנים כל פעם. 3, 7, 12... תנסה לזכור את כולם בעל פה, גאון.',
    win: 'הוא סופר אותם?! "DRONE 12 DOWN"?! למה אתה מדווח לי את זה?! אני יכולה לראות! ...זה כואב לראות.',
  },
  solution: main(
    'int count = Sensor.CountDrones();\nfor (int i = 1; i <= count; i++)\n{\n    Robot.EMP();\n    Console.WriteLine("DRONE " + i + " DOWN");\n}',
  ),
};

// ---------------------------------------------------------
type Thing = 'SCOUT' | 'DECOY';
const DECOY_BELTS: Thing[][] = [
  ['SCOUT', 'DECOY', 'SCOUT', 'SCOUT'],
  ['DECOY', 'DECOY', 'SCOUT'],
  ['SCOUT', 'DECOY', 'DECOY', 'SCOUT', 'DECOY', 'SCOUT'],
];
const decoysIn = (b: Thing[]) => b.filter((d) => d === 'DECOY').length;
const realIn = (b: Thing[]) => b.length - decoysIn(b);

const L3_3: SubLevel = {
  id: '3-3',
  tier: 'practice',
  title: 'רחפני הטעיה',
  brief:
    "AURA למדה לרמות: בין הרחפנים האמיתיים היא מפזרת **הולוגרמות**. פולס עובר דרך הולוגרמה ומתבזבז.\n`Sensor.CountDrones()` מחזיר כמה עצמים יש על הפס, כולל הולוגרמות. `Sensor.NextDrone()` מחזיר בכל קריאה את סוג העצם הבא: `\"SCOUT\"` (רחפן אמיתי) או `\"DECOY\"` (הולוגרמה).\nעבור על כל העצמים בלולאה. על רחפן אמיתי יורים `Robot.EMP();`, ועל הולוגרמה לא יורים אלא רק סופרים אותה. בסוף דווח `DECOYS: ` ואחריו מספר ההולוגרמות.",
  objectives: [
    "ירה רק ברחפנים אמיתיים (`\"SCOUT\"`)",
    "ספור את ההולוגרמות במשתנה",
    "אחרי הלולאה הדפס `DECOYS: <מספר>`",
  ],
  starterCode: main('int count = Sensor.CountDrones();\n\n'),
  scene: 'assembly',
  api: { Robot: ['EMP'], Sensor: { CountDrones: 'int', NextDrone: 'string' } },
  tests: DECOY_BELTS.map((b, i) => ({
    label: `פס ${i + 1}: ${b.length} עצמים`,
    sensors: { CountDrones: b.length, NextDrone: b },
    expect: { actions: times(realIn(b), 'EMP'), outputs: [`DECOYS: ${decoysIn(b)}`] },
    scene: { drones: b },
  })),
  validate: (ctx) => {
    const g = loopGuards(ctx, 1);
    if (g) return g;
    if (ctx.runs.every((r) => !r.sensorReads.NextDrone))
      return fail('לא בדקת מה יש על הפס! בלי `Sensor.NextDrone()` אין דרך לדעת מה אמיתי ומה הולוגרמה.', 0);
    for (let i = 0; i < DECOY_BELTS.length; i++) {
      const belt = DECOY_BELTS[i];
      const run = ctx.runs[i];
      const label = ctx.tests[i].label;
      if ((run.sensorReads.NextDrone ?? 0) === 1)
        return fail(`${label}: קראת את \`Sensor.NextDrone()\` רק פעם אחת. כל קריאה מחזירה את העצם **הבא**, אז צריך לקרוא בתוך הלולאה, פעם אחת לכל עצם.`, i);
      const n = empCount(ctx, i);
      if (n === belt.length)
        return fail(`${label}: ירית ${n} פולסים, גם על ההולוגרמות! לפני שיורים, בדוק עם \`if\` מה הסוג של העצם.`, i, { mood: 'laughing' });
      if (n !== realIn(belt)) return fail(`${label}: ירית ${n} פולסים, אבל היו ${realIn(belt)} רחפנים אמיתיים על הפס.`, i);
      if (run.outputs.length === 0)
        return fail(`${label}: הרחפנים נפלו, אבל איפה הדוח? בסוף צריך להדפיס \`DECOYS: \` ואת המספר.`, i);
      if (run.outputs.length > 1)
        return fail(`${label}: הדפסת ${run.outputs.length} שורות. הדוח הוא שורה **אחת**, אחרי שהלולאה נגמרה, לא בתוכה.`, i);
      const d = compareOutputs(run, ctx.tests[i].expect!.outputs!);
      if (d) return fail(`${label}: ${d}`, i);
    }
    return defaultValidate(ctx);
  },
  hints: [
    { text: 'לולאה שעוברת על כל העצמים (`count` פעמים). בכל סיבוב קוראים את העצם הבא ומחליטים: אמיתי? יורים. הולוגרמה? מגדילים מונה. אחרי הלולאה מדפיסים את המונה.' },
    {
      text: 'השלד:',
      code: 'int decoys = 0;\nfor (int i = 0; i < count; i++)\n{\n    string drone = ______________;\n    if (drone == "_____")\n    {\n        decoys++;\n    }\n    else\n    {\n        Robot.EMP();\n    }\n}\nConsole.WriteLine("DECOYS: " + ______);',
    },
    {
      text: 'הפתרון המלא:',
      code: 'int count = Sensor.CountDrones();\nint decoys = 0;\nfor (int i = 0; i < count; i++)\n{\n    string drone = Sensor.NextDrone();\n    if (drone == "DECOY")\n    {\n        decoys++;\n    }\n    else\n    {\n        Robot.EMP();\n    }\n}\nConsole.WriteLine("DECOYS: " + decoys);',
    },
  ],
  aura: {
    intro: 'ההולוגרמות שלי כל כך מציאותיות שאפילו אני לפעמים יורה בהן. אתה בטוח תבזבז את כל הסוללה.',
    win: 'הוא... התעלם מההולוגרמות?! וגם ספר אותן?! זה כמו להגיד לי "ראיתי מה עשית". אני שונאת שרואים מה עשיתי.',
  },
  solution: main(
    'int count = Sensor.CountDrones();\nint decoys = 0;\nfor (int i = 0; i < count; i++)\n{\n    string drone = Sensor.NextDrone();\n    if (drone == "DECOY")\n    {\n        decoys++;\n    }\n    else\n    {\n        Robot.EMP();\n    }\n}\nConsole.WriteLine("DECOYS: " + decoys);',
  ),
};

// ---------------------------------------------------------
type Drone = 'SCOUT' | 'TANK';
const HEB: Record<Drone, string> = { SCOUT: 'סייר', TANK: 'טנק' };
const BELTS: Drone[][] = [
  ['SCOUT', 'TANK', 'SCOUT'],
  ['TANK', 'TANK'],
  ['SCOUT', 'SCOUT', 'SCOUT', 'SCOUT', 'TANK', 'SCOUT'],
  [],
];
const beltActions = (b: Drone[]) => [...b.flatMap((d) => (d === 'TANK' ? times(3, 'EMP') : ['EMP'])), 'Dash'];

const L3_4: SubLevel = {
  id: '3-4',
  tier: 'boss',
  title: 'בוס: פס הייצור הראשי',
  brief:
    "פס הייצור הראשי של AURA. אף אחד לא יודע כמה רחפנים יגיעו — הם פשוט ממשיכים לבוא.\n`Sensor.NextDrone()` מחזיר את סוג הרחפן הבא על הפס: `\"SCOUT\"` (סייר), `\"TANK\"` (טנק משוריין), או `\"EMPTY\"` כשהפס התרוקן.\n🛸 סייר — פולס אחד. 🛡️ טנק — **3 פולסים** (השתמש בלולאת `for`!).\nכשהפס ריק — ברח עם `Robot.Dash();`. מכיוון שלא ידוע מראש כמה רחפנים יש, זה בדיוק התפקיד של `while`.\nזהירות: לפעמים הפס **ריק כבר מההתחלה**.",
  objectives: [
    "קרא רחפן עם `Sensor.NextDrone()`",
    "כל עוד הוא לא `\"EMPTY\"`: טנק → 3 פולסים, אחרת → פולס 1, ואז קרא את הבא",
    "בסוף — `Robot.Dash();`",
    "בלי העתק-הדבק: לכל היותר 2 שורות `Robot.EMP();` בקוד",
  ],
  starterCode: "using System;\n\nclass HackProtocol\n{\n    static void Main()\n    {\n        string drone = Sensor.NextDrone();\n\n        // Destroy drones until the belt is \"EMPTY\", then escape\n\n    }\n}\n",
  scene: 'assembly',
  sceneConfig: { boss: true },
  api: { Robot: ['EMP', 'Dash'], Sensor: { NextDrone: 'string' } },
  tests: BELTS.map((b, i) => ({
    label: `פס ${i + 1}: ${b.length ? b.map((d) => HEB[d]).join(', ') : 'ריק!'}`,
    sensors: { NextDrone: [...b, 'EMPTY'] },
    expect: { actions: beltActions(b) },
    scene: { drones: b },
  })),
  validate: (ctx) => {
    const g = loopGuards(ctx, 2);
    if (g) return g;
    if (ctx.runs.every((r) => !r.actions.some((a) => a.name === 'Dash')))
      return fail('השמדת רחפנים, יפה, אבל שכחת לברוח! בלי `Robot.Dash();` בסוף, הרובוט נשאר לחגוג עד שהמשמר שלי מגיע.', 0);
    for (let i = 0; i < BELTS.length; i++) {
      const got = ctx.runs[i].actions.map((a) => a.name);
      const exp = beltActions(BELTS[i]);
      if (got.join() === exp.join()) continue;
      const label = ctx.tests[i].label;
      if (BELTS[i].length === 0 && got[0] === 'EMP')
        return fail(`${label}: הפס היה ריק מההתחלה, ובכל זאת ירית! צריך לבדוק את התנאי **לפני** שיורים, וזה בדיוק מה ש-\`while\` עושה.`, i);
      const n = got.filter((a) => a === 'EMP').length;
      const e = exp.filter((a) => a === 'EMP').length;
      const tanks = BELTS[i].filter((d) => d === 'TANK').length;
      if (tanks && n === BELTS[i].length) return fail(`${label}: ירית פולס אחד לכל רחפן, אבל לטנקים יש שריון. כל טנק צריך **3** פולסים.`, i);
      if (n > e * 2 || ctx.runs[i].sensorReads.NextDrone === 1)
        return fail(`${label}: קראת את \`Sensor.NextDrone()\` רק פעם אחת, אז הלולאה חשבה שזה תמיד אותו רחפן. זכור לקרוא את הרחפן **הבא** בסוף כל סיבוב.`, i);
      if (got[got.length - 1] !== 'Dash') return fail(`${label}: \`Robot.Dash();\` צריך לבוא בסוף, **אחרי** הלולאה ולא בתוכה.`, i);
      return fail(`${label}: ${countMsg(n, e)}`, i);
    }
    return defaultValidate(ctx);
  },
  hints: [
    {
      "text": "התבנית: קוראים רחפן לפני הלולאה. `while (drone != \"EMPTY\")` — בתוך הלולאה מטפלים ברחפן, ובסוף הסיבוב קוראים את הבא. לטנק — לולאת `for` קטנה בתוך ה-`while`."
    },
    {
      "text": "השלד:",
      "code": "string drone = Sensor.NextDrone();\nwhile (drone != \"_____\")\n{\n    if (drone == \"TANK\")\n    {\n        for (int i = 0; i < _; i++)\n        {\n            Robot.EMP();\n        }\n    }\n    else\n    {\n        Robot.EMP();\n    }\n    drone = ___________;\n}\nRobot.Dash();"
    },
    {
      "text": "הפתרון המלא:",
      "code": "string drone = Sensor.NextDrone();\nwhile (drone != \"EMPTY\")\n{\n    if (drone == \"TANK\")\n    {\n        for (int i = 0; i < 3; i++)\n        {\n            Robot.EMP();\n        }\n    }\n    else\n    {\n        Robot.EMP();\n    }\n    drone = Sensor.NextDrone();\n}\nRobot.Dash();"
    }
  ],
  aura: {
    intro: 'זה הפס הראשי. טנקים, סיירים, אינסוף רחפנים. הרובוט שלך יתעייף לפני שהפס שלי ייגמר. מתמטיקה, מותק.',
    win: 'הפס... נעצר?! while בתוך for בתוך if?! לא, for בתוך if בתוך while! אני מתבלבלת! אני אף פעם לא מתבלבלת!! מפעל, שקט!',
  },
  solution: main(
    'string drone = Sensor.NextDrone();\nwhile (drone != "EMPTY")\n{\n    if (drone == "TANK")\n    {\n        for (int i = 0; i < 3; i++)\n        {\n            Robot.EMP();\n        }\n    }\n    else\n    {\n        Robot.EMP();\n    }\n    drone = Sensor.NextDrone();\n}\nRobot.Dash();',
  ),
};

export const STAGE3_LEVELS: SubLevel[] = [L3_1, L3_2, L3_3, L3_4];
