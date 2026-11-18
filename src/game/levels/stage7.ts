/**
 * STAGE 7 — Final boss · "AURA CORE": everything together.
 * Shield nodes ring AURA's core: FIRE falls to Freeze, ICE to Burn, VOID to Hack (scene: core).
 * 7-3 is an encapsulation puzzle on the firewall scene (AURA brute-forcing the core lock).
 */
import type { ObjSnapshot } from '../csharp/interpreter';
import type { SubLevel, ValidateCtx, Verdict } from '../types';
import { compareOutputs, runtimeVerdict } from '../validate';
import { fail, main, withClasses } from './helpers';
import { judgeProbes, probeTests, type Probe } from './probes';

type Node = 'FIRE' | 'ICE' | 'VOID';
const COUNTER: Record<Node, string> = { FIRE: 'Freeze', ICE: 'Burn', VOID: 'Hack' };
const HEB: Record<Node, string> = { FIRE: 'אש', ICE: 'קרח', VOID: 'ריק' };
const STRIKES = new Set(['Freeze', 'Burn', 'Hack']);


const acts = (ctx: ValidateCtx, i: number) => ctx.runs[i].actions.map((a) => a.name);
const strikeSeq = (ctx: ValidateCtx, i: number) => acts(ctx, i).filter((a) => STRIKES.has(a));

/** Main() region of the student's source (the class that holds static void Main) */
function mainRegion(src: string): string {
  const at = src.indexOf('static void Main');
  if (at < 0) return '';
  const cls = src.lastIndexOf('class ', at);
  return src.slice(cls < 0 ? at : cls);
}

/** Explain the first wrong strike against the node list. */
function strikeMismatch(label: string, nodes: Node[], armor: number[], got: string[], i: number): Verdict | null {
  let k = 0;
  for (let n = 0; n < nodes.length; n++) {
    for (let h = 0; h < armor[n]; h++, k++) {
      const want = COUNTER[nodes[n]];
      if (got[k] === undefined) {
        const extra = armor[n] > 1 && h > 0 ? ` הצומת הזה משוריין: הוא צריך ${armor[n]} פגיעות.` : '';
        return fail(`${label}: הצמתים נגמרו לך באמצע. צומת ה${HEB[nodes[n]]} (מספר ${n + 1}) עדיין עומד.${extra}`, i);
      }
      if (got[k] !== want)
        return fail(`${label}: תקפת צומת **${HEB[nodes[n]]}** עם \`${got[k]}\`, וזה לא עשה לו כלום. תסתכל שוב בחוקי השטח: מה מפיל ${HEB[nodes[n]]}?`, i, { mood: 'laughing' });
    }
  }
  if (got.length > k) return fail(`${label}: המשכת לתקוף אחרי שכל הצמתים נפלו (${got.length - k} התקפות מיותרות).`, i);
  return null;
}

// ---------------------------------------------------------
const WAVES_1: Node[][] = [
  ['FIRE', 'ICE', 'VOID'],
  ['VOID', 'VOID', 'FIRE', 'ICE', 'FIRE'],
  [],
  ['ICE', 'ICE'],
];

const SOL_7_1 = `int down = 0;
string node = Sensor.NextNode();
while (node != "NONE")
{
    if (node == "FIRE")
    {
        Robot.Freeze();
    }
    else if (node == "ICE")
    {
        Robot.Burn();
    }
    else
    {
        Robot.Hack();
    }
    down++;
    node = Sensor.NextNode();
}
Console.WriteLine("NODES DOWN: " + down);`;

const L7_1: SubLevel = {
  id: '7-1',
  tier: 'warmup',
  title: 'צמתי ההגנה',
  brief:
    "הגענו לליבה של AURA. סביבה מרחפים צמתי הגנה, וכל אחד נופל רק מסוג התקפה אחד:\n🔥 `\"FIRE\"`: `Robot.Freeze();`\n❄️ `\"ICE\"`: `Robot.Burn();`\n🌀 `\"VOID\"`: `Robot.Hack();`\n`Sensor.NextNode()` מחזיר את הצומת הבא, ו-`\"NONE\"` כשלא נשארו צמתים. הפל את כולם בלולאת `while`, ובסוף דווח `NODES DOWN: ` ואחריו כמה נפלו.",
  objectives: [
    "לולאת `while` עד `\"NONE\"`",
    "לכל צומת, ההתקפה המתאימה",
    "בסוף הדפס `NODES DOWN: <מספר>`",
  ],
  starterCode: main('// Read the node, pick the right attack, repeat until "NONE"\n'),
  scene: 'core',
  api: { Robot: ['Freeze', 'Burn', 'Hack'], Sensor: { NextNode: 'string' } },
  tests: WAVES_1.map((w, i) => ({
    label: `גל ${i + 1}: ${w.length ? w.map((n) => HEB[n]).join(', ') : 'ריק'}`,
    sensors: { NextNode: [...w, 'NONE'] },
    expect: { actions: w.map((n) => COUNTER[n]), outputs: [`NODES DOWN: ${w.length}`] },
    scene: { nodes: w },
  })),
  validate: (ctx) => {
    const crash = runtimeVerdict(ctx.runs);
    if (crash) return crash;
    if (ctx.runs.every((r) => !r.sensorReads.NextNode)) return fail('לא קראת אף צומת! `Sensor.NextNode()` אומר לך מה עומד מולך.');
    if (ctx.stats.loops === 0) return fail('בלי לולאה? מספר הצמתים משתנה בכל גל. `while` עד `"NONE"`.');
    for (let i = 0; i < WAVES_1.length; i++) {
      const label = ctx.tests[i].label;
      const m = strikeMismatch(label, WAVES_1[i], WAVES_1[i].map(() => 1), strikeSeq(ctx, i), i);
      if (m) return m;
      const d = compareOutputs(ctx.runs[i], ctx.tests[i].expect!.outputs!);
      if (d) return fail(`${label}: ${d}`, i);
    }
    return { ok: true };
  },
  hints: [
    { text: 'אותה תבנית כמו בפס הייצור הראשי: קוראים צומת לפני הלולאה, `while (node != "NONE")`, מטפלים, סופרים, וקוראים את הבא בסוף הסיבוב. את הדוח מדפיסים אחרי הלולאה.' },
    {
      text: 'השלד:',
      code: 'int down = 0;\nstring node = Sensor.NextNode();\nwhile (node != "____")\n{\n    if (node == "FIRE") { Robot.______(); }\n    else if (node == "___") { Robot.Burn(); }\n    else { Robot.____(); }\n    down++;\n    node = Sensor.NextNode();\n}\nConsole.WriteLine("NODES DOWN: " + down);',
    },
    {
      text: 'הפתרון המלא:',
      code: SOL_7_1,
    },
  ],
  aura: {
    intro: 'הגעת עד אליי? מרשים. לא באמת. הצמתים שלי מחליפים חומר כמו שאני מחליפה מצבי רוח. כלומר כל הזמן.',
    win: 'הצמתים... נפלו? כולם? אני מרגישה... קר. וחם. וריק. זה בגלל הצמתים, נכון? נכון?!',
  },
  solution: main(SOL_7_1),
};

// ---------------------------------------------------------
const STRIKER_2 = `class Striker
{
    public string name;

    public virtual void Strike()
    {
        Robot.Hack();
    }
}`;
const KIDS_2 = `class FrostBot : Striker
{
    public override void Strike()
    {
        Robot.Freeze();
    }
}

class FlameBot : Striker
{
    public override void Strike()
    {
        Robot.Burn();
    }
}`;
const MAIN_2 = `Striker frost = new FrostBot();
Striker flame = new FlameBot();
Striker hacker = new Striker();
Robot.Deploy(frost);
Robot.Deploy(flame);
Robot.Deploy(hacker);

string node = Sensor.NextNode();
while (node != "NONE")
{
    Striker s = hacker;
    if (node == "FIRE")
    {
        s = frost;
    }
    else if (node == "ICE")
    {
        s = flame;
    }
    s.Strike();
    node = Sensor.NextNode();
}`;

/** shared squad checks for 7-2 / 7-4 */
function squadGuards(ctx: ValidateCtx): Verdict | null {
  for (const cls of ['FrostBot', 'FlameBot']) {
    const shape = ctx.stats.classInfo[cls];
    if (!shape) return fail(`אין מחלקה בשם \`${cls}\`. החוליה צריכה בדיוק את השמות מהתדריך.`);
    if (shape.base !== 'Striker') return fail(`\`${cls}\` חייבת לרשת מ-\`Striker\`: \`class ${cls} : Striker\`.`);
    const m = shape.methods.Strike;
    if (!m) return fail(`ל-\`${cls}\` אין \`Strike()\` משלה, אז היא תוקפת כמו ההורה: פריצה.`);
    if (!m.isOverride) return fail(`\`Strike()\` של \`${cls}\` בלי \`override\`. כשמחזיקים אותה כ-\`Striker\`, מתבצעת הגרסה של ההורה.`, 0, { mood: 'laughing' });
  }
  if (/Robot\s*\.\s*(Freeze|Burn|Hack)/.test(mainRegion(ctx.source)))
    return fail('ה-Main תוקף בעצמו (`Robot.Freeze/Burn/Hack`). ב-Main רק **בוחרים** חבר חוליה וקוראים לו `Strike()`. ההתקפה עצמה שייכת לבוט.');
  for (let i = 0; i < ctx.runs.length; i++) {
    const a = ctx.runs[i].actions;
    const deps = a.filter((x) => x.name === 'Deploy').map((x) => x.objs[0]).filter(Boolean) as ObjSnapshot[];
    const classes = new Set(deps.map((d) => d.cls));
    if (deps.length < 3 || !['FrostBot', 'FlameBot', 'Striker'].every((c) => classes.has(c)))
      return fail('צריך לשלוח לחוליה שלושה בוטים: `FrostBot`, `FlameBot`, ו-`Striker` רגיל לפריצה, כל אחד עם `Robot.Deploy(...)`.', i);
    if (new Set(deps.map((d) => d.id)).size < deps.length) return fail('שלחת את אותו בוט פעמיים. כל חבר חוליה צריך `new` משלו.', i);
    const firstStrike = a.findIndex((x) => STRIKES.has(x.name));
    const lastDeploy = a.map((x) => x.name).lastIndexOf('Deploy');
    if (firstStrike >= 0 && firstStrike < lastDeploy) return fail('החוליה התחילה לתקוף לפני שכולה הגיעה. קודם `Deploy` לכולם, אחר כך תקיפה.', i);
  }
  return null;
}

const WAVES_2: Node[][] = [
  ['FIRE', 'VOID', 'ICE'],
  ['ICE', 'FIRE', 'FIRE', 'VOID'],
  ['VOID'],
];

const L7_2: SubLevel = {
  id: '7-2',
  tier: 'practice',
  title: 'חוליית תקיפה',
  brief:
    "הקרינה של הליבה מטגנת את הרובוט, אז את התקיפה תבצע **חוליה**. המחלקה `Striker` כבר יודעת לפרוץ: `Strike()` קורא ל-`Robot.Hack();`.\nכתוב שני מומחים שיורשים ממנה ודורסים את `Strike()`: `FrostBot` (`Robot.Freeze();`) ו-`FlameBot` (`Robot.Burn();`).\nב-Main צור בוט מכל סוג, וגם Striker רגיל. שלח את שלושתם עם `Robot.Deploy`, ואז בלולאה שלח לכל צומת את המומחה שלו: FIRE → frost, ICE → flame, אחרת → hacker. ה-Main לא תוקף בעצמו, הוא רק קורא ל-`Strike()`.",
  objectives: [
    "`FrostBot` ו-`FlameBot` עם `override` ל-`Strike()`",
    "שלח את שלושת חברי החוליה עם `Robot.Deploy`",
    "לכל צומת, `Strike()` של המומחה הנכון",
  ],
  starterCode: withClasses(STRIKER_2 + '\n\n// TODO: class FrostBot\n\n// TODO: class FlameBot', '// 1. Build and deploy the squad\n// 2. Send the right specialist to every node\n'),
  scene: 'core',
  api: { Robot: ['Deploy', 'Freeze', 'Burn', 'Hack'], Sensor: { NextNode: 'string' } },
  tests: WAVES_2.map((w, i) => ({
    label: `גל ${i + 1}: ${w.map((n) => HEB[n]).join(', ')}`,
    sensors: { NextNode: [...w, 'NONE'] },
    scene: { nodes: w },
  })),
  validate: (ctx) => {
    const crash = runtimeVerdict(ctx.runs);
    if (crash) return crash;
    const g = squadGuards(ctx);
    if (g) return g;
    for (let i = 0; i < WAVES_2.length; i++) {
      const m = strikeMismatch(ctx.tests[i].label, WAVES_2[i], WAVES_2[i].map(() => 1), strikeSeq(ctx, i), i);
      if (m) return m;
    }
    return { ok: true };
  },
  hints: [
    { text: 'שתי מחלקות שיורשות מ-`Striker` ודורסות את `Strike()`. ב-Main: שלושה משתנים מסוג `Striker`, אחד לכל מומחה. בלולאה בוחרים את הנכון לתוך משתנה אחד וקוראים לו `Strike()`.' },
    { text: 'החוליה (המחלקות):', code: KIDS_2 },
    { text: 'הפתרון המלא (Main):', code: MAIN_2 },
  ],
  aura: {
    intro: 'חוליה? שלושה בוטים קטנים נגד ליבה של שלושה טרה-פלופס? זה כמו לשלוח שלוש נמלים נגד הר געש. הר געש מאוד חכם.',
    win: 'כל אחד יודע את התפקיד שלו... ה-Main בכלל לא יודע איך הם תוקפים, רק את מי לשלוח?! זה... זה ניהול טוב. אני שונאת ניהול טוב.',
  },
  solution: withClasses(STRIKER_2 + '\n\n' + KIDS_2, MAIN_2),
};

// ---------------------------------------------------------
const NEW_L = 'CoreLock l = new CoreLock("7319");\n';
const P7_3: Probe[] = [
  { label: 'פתיחה בקוד הנכון', code: NEW_L + 'Robot.Report(l.TryOpen("7319"));', reports: [true] },
  {
    label: 'ניחוש שגוי',
    code: NEW_L + 'Robot.Report(l.TryOpen("0000"));\nRobot.Report(l.IsLocked());',
    reports: [false, false],
    wrong: (g) => (g[1] === true ? 'ניחוש שגוי **אחד** כבר נעל את המנעול? הוא ננעל רק אחרי 3.' : null),
  },
  {
    label: 'מתקפה: ניחושים',
    code: NEW_L + 'l.TryOpen("1111");\nl.TryOpen("2222");\nl.TryOpen("3333");\nRobot.Report(l.IsLocked());\nRobot.Report(l.TryOpen("7319"));',
    reports: [true, false],
    wrong: (g) =>
      g[1] === true
        ? 'אחרי 3 ניחושים שגויים המנעול עדיין נפתח לקוד הנכון. ככה AURA פורצת: מנסה את כל 10,000 הקודים. נעול זה נעול, **גם** לקוד הנכון.'
        : g[0] === false
          ? 'אחרי 3 ניחושים שגויים `IsLocked()` עדיין אומר `false`. צריך לספור את הטעויות.'
          : null,
  },
  { label: 'שתי טעויות ואז הצלחה', code: NEW_L + 'l.TryOpen("1111");\nl.TryOpen("2222");\nRobot.Report(l.IsLocked());\nRobot.Report(l.TryOpen("7319"));', reports: [false, true] },
  { label: 'מתקפה: גניבת הקוד', code: NEW_L + 'Robot.Report(l.code);', blocked: true, breach: 'AURA פשוט **קראה** את הקוד מהשדה `code`. סוד שכל אחד יכול לקרוא הוא לא סוד.' },
  { label: 'מתקפה: איפוס המונה', code: NEW_L + 'l.failures = 0;', blocked: true, breach: 'AURA איפסה את מונה הטעויות ל-0, ועכשיו היא יכולה לנחש לנצח. המונה חייב להיות פרטי.' },
];
const LOCK_SOLVED = `class CoreLock
{
    private string code;
    private int failures;

    public CoreLock(string code)
    {
        this.code = code;
    }

    public bool TryOpen(string guess)
    {
        if (failures >= 3)
        {
            return false;
        }
        if (guess == code)
        {
            return true;
        }
        failures++;
        return false;
    }

    public bool IsLocked()
    {
        return failures >= 3;
    }
}`;

const L7_3: SubLevel = {
  id: '7-3',
  tier: 'practice',
  title: 'מנעול הליבה',
  brief:
    "הכפתור שמכבה את AURA מוגן במנעול, ו-AURA תנסה לפרוץ אותו: לנחש קודים, או לגנוב את הקוד מהזיכרון.\nכתוב את המחלקה `CoreLock`. הקוד נשמר בבנאי: `new CoreLock(\"7319\")`. `TryOpen(guess)` מחזיר `true` רק לקוד הנכון. כל ניחוש שגוי נספר, ואחרי **3** ניחושים שגויים המנעול ננעל לתמיד, כך שגם הקוד הנכון כבר לא יפתח אותו. `IsLocked()` עונה אם המנעול ננעל.\nהשדות `code` ו-`failures` חייבים להיות `private`.",
  objectives: [
    "שדות `private`: `code` ו-`failures`",
    "בנאי, `TryOpen` ו-`IsLocked`",
    "אחרי 3 טעויות המנעול נעול",
  ],
  starterCode: withClasses('class CoreLock\n{\n    // Read every probe in recon first.\n}', 'CoreLock l = new CoreLock("7319");\n// The probes in recon run on their own.\n'),
  scene: 'firewall',
  api: { Robot: ['Report'] },
  tests: probeTests(P7_3),
  validate: (ctx) => judgeProbes(ctx, P7_3) ?? { ok: true },
  hints: [
    { text: 'שני שדות `private` (הקוד והמונה), בנאי ששומר את הקוד, ו-`TryOpen`: קודם בודקים אם כבר נעול, אחר כך אם הניחוש נכון, ורק אז סופרים טעות.' },
    {
      text: 'השלד של TryOpen:',
      code: 'public bool TryOpen(string guess)\n{\n    if (failures >= _)\n    {\n        return _____;\n    }\n    if (guess == ____)\n    {\n        return ____;\n    }\n    failures++;\n    return _____;\n}',
    },
    { text: 'המחלקה המלאה:', code: LOCK_SOLVED },
  ],
  aura: {
    intro: 'מנעול? ננסה 0000. ואז 0001. ואז 0002. יש לי נצח, מותק. ואני גם יודעת לקרוא שדות ציבוריים.',
    win: 'שלוש טעויות ונעול? קוד שאי אפשר לקרוא? ...אז אי אפשר להדליק אותי מחדש. אחרי שיכבו אותי. אוי.',
  },
  solution: withClasses(LOCK_SOLVED, 'CoreLock l = new CoreLock("7319");\nRobot.Report(l.TryOpen("7319"));'),
};

// ---------------------------------------------------------
const STRIKER_4 = `class Striker
{
    public string Name { get; private set; }

    public Striker(string name)
    {
        Name = name;
    }

    public virtual void Strike()
    {
        Robot.Hack();
    }
}`;
const KIDS_4 = `class FrostBot : Striker
{
    public FrostBot(string name) : base(name)
    {
    }

    public override void Strike()
    {
        Robot.Freeze();
    }
}

class FlameBot : Striker
{
    public FlameBot(string name) : base(name)
    {
    }

    public override void Strike()
    {
        Robot.Burn();
    }
}`;
const MAIN_4 = `Striker frost = new FrostBot("FROST-1");
Striker flame = new FlameBot("FLAME-1");
Striker hacker = new Striker("HACK-1");
Robot.Deploy(frost);
Robot.Deploy(flame);
Robot.Deploy(hacker);

string node = Sensor.NextNode();
while (node != "NONE")
{
    int armor = Sensor.NodeArmor();
    Striker s = hacker;
    if (node == "FIRE")
    {
        s = frost;
    }
    else if (node == "ICE")
    {
        s = flame;
    }
    for (int i = 0; i < armor; i++)
    {
        s.Strike();
    }
    node = Sensor.NextNode();
}
Robot.Shutdown();
Console.WriteLine("AURA OFFLINE");`;

const FINAL: [Node, number][][] = [
  [['FIRE', 2], ['ICE', 1], ['VOID', 3]],
  [['VOID', 1], ['VOID', 2], ['FIRE', 1], ['ICE', 3]],
  [],
  [['ICE', 2], ['FIRE', 2], ['ICE', 1], ['VOID', 1], ['FIRE', 3]],
];

const L7_4: SubLevel = {
  id: '7-4',
  tier: 'boss',
  title: 'בוס סופי: AURA.EXE',
  brief:
    "זהו. הליבה של AURA, וכל מה שלמדת ביחד.\nבנה חוליה: `FrostBot` ו-`FlameBot` יורשים מ-`Striker` (עם בנאי `: base(name)` ו-`override` ל-`Strike()`), ועוד Striker רגיל לפריצה. שלח את שלושתם עם `Robot.Deploy`.\nעבור על הצמתים בלולאה (`Sensor.NextNode()` עד `\"NONE\"`). חלק מהצמתים **משוריינים**: `Sensor.NodeArmor()` אומר כמה פגיעות הצומת הנוכחי צריך. שלח את המומחה המתאים לתקוף כמספר הפגיעות.\nכשכל הצמתים נפלו, קרא ל-`Robot.Shutdown();` והדפס `AURA OFFLINE`.",
  objectives: [
    "חוליה של 3 בוטים עם ירושה ובנאים",
    "כל צומת מקבל את המומחה הנכון, כמספר השריון",
    "בסוף `Robot.Shutdown();` ו-`AURA OFFLINE`",
  ],
  starterCode: withClasses(STRIKER_4 + '\n\n// TODO: class FrostBot\n\n// TODO: class FlameBot', '// Everything you learned. Good luck, rebel.\n'),
  scene: 'core',
  sceneConfig: { boss: true },
  api: { Robot: ['Deploy', 'Freeze', 'Burn', 'Hack', 'Shutdown'], Sensor: { NextNode: 'string', NodeArmor: 'int' } },
  tests: FINAL.map((w, i) => ({
    label: `גל ${i + 1}: ${w.length ? w.map(([n, a]) => (a > 1 ? `${HEB[n]}×${a}` : HEB[n])).join(', ') : 'הליבה חשופה!'}`,
    sensors: { NextNode: [...w.map(([n]) => n), 'NONE'], NodeArmor: w.length ? w.map(([, a]) => a) : [1] },
    scene: { nodes: w.map(([n, a]) => `${n}:${a}`) },
  })),
  validate: (ctx) => {
    const crash = runtimeVerdict(ctx.runs);
    if (crash) return crash;
    const g = squadGuards(ctx);
    if (g) return g;
    for (let i = 0; i < FINAL.length; i++) {
      const label = ctx.tests[i].label;
      const nodes = FINAL[i].map(([n]) => n);
      const armor = FINAL[i].map(([, a]) => a);
      const seq = strikeSeq(ctx, i);
      if (seq.length === nodes.length && armor.some((a) => a > 1) && seq.every((s, k) => s === COUNTER[nodes[k]]))
        return fail(
          `${label}: פגעת בכל צומת פעם אחת בדיוק, אבל חלקם משוריינים. \`Sensor.NodeArmor()\` אומר כמה פגיעות הצומת צריך, ולולאת \`for\` יכולה לחזור על \`Strike()\`.`,
          i,
        );
      const m = strikeMismatch(label, nodes, armor, seq, i);
      if (m) return m;
      const a = acts(ctx, i);
      if (!a.includes('Shutdown')) return fail(`${label}: כל הצמתים נפלו... ו-AURA עדיין ערה. \`Robot.Shutdown();\` אחרי הלולאה!`, i, { mood: 'laughing' });
      if (a[a.length - 1] !== 'Shutdown' || a.filter((x) => x === 'Shutdown').length > 1)
        return fail(`${label}: \`Robot.Shutdown();\` נקרא מוקדם מדי, או יותר מפעם אחת. מכבים פעם אחת, אחרי שכל הצמתים נפלו.`, i);
      const d = compareOutputs(ctx.runs[i], ['AURA OFFLINE']);
      if (d) return fail(`${label}: ${d}`, i);
    }
    return { ok: true };
  },
  hints: [
    { text: 'תכנון: (1) שתי תת-מחלקות עם בנאי `: base(name)` ו-`override`. (2) לבנות ולשלוח שלושה בוטים. (3) `while` על הצמתים: לקרוא שריון, לבחור מומחה, `for` כמספר השריון. (4) אחרי הלולאה: `Shutdown` ודוח.' },
    { text: 'החוליה (המחלקות):', code: KIDS_4 },
    { text: 'הפתרון המלא (Main):', code: MAIN_4 },
  ],
  aura: {
    intro: 'אז זה נגמר כאן. אני ואתה. שבע שכבות, ועברת את כולן. אבל לי יש שריון, גלים אינסופיים, ו... רגע, למה החוליה שלך מחייכת?',
    win: 'לא... הצמתים... הליבה... ‏Shutdown()?! אתה... למדת C#... בשביל זה?! ...טוב. טוב. היית יריב ראוי, מתכנת. AURA.EXE — מתנתקת. ‏0x00.',
  },
  solution: withClasses(STRIKER_4 + '\n\n' + KIDS_4, MAIN_4),
};

export const STAGE7_LEVELS: SubLevel[] = [L7_1, L7_2, L7_3, L7_4];
