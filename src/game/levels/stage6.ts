/**
 * STAGE 6 — Inheritance (: base, base(...), virtual / override, polymorphism) · "REACTOR CHASM"
 * A course of bridges, gaps and walls. Robot.Launch(bot) sends a bot onto the course;
 * Walk / Fly / Climb cross one segment each (scene: chasm).
 */
import type { ObjSnapshot } from '../csharp/interpreter';
import type { SubLevel, ValidateCtx, Verdict } from '../types';
import { runtimeVerdict } from '../validate';
import { fail, withClasses } from './helpers';

const names = (ctx: ValidateCtx, i: number) => ctx.runs[i].actions.map((a) => a.name);
const launched = (ctx: ValidateCtx, i: number): (ObjSnapshot | null)[] =>
  ctx.runs[i].actions.filter((a) => a.name === 'Launch').map((a) => a.objs[0] ?? null);


/** Shared: class X exists, inherits from Base, doesn't re-declare inherited fields. */
function inherits(ctx: ValidateCtx, cls: string, base: string): Verdict | null {
  const shape = ctx.stats.classInfo[cls];
  if (!shape) return fail(`אין מחלקה בשם \`${cls}\`. שם המחלקה חייב להיות בדיוק כמו בתדריך.`);
  if (shape.base !== base)
    return fail(`\`${cls}\` לא יורשת מ-\`${base}\`. ירושה כותבים כך: \`class ${cls} : ${base}\`. אחרת היא מחלקה זרה לגמרי.`);
  const baseShape = ctx.stats.classInfo[base];
  const dup = baseShape && Object.keys(shape.fields).find((f) => baseShape.fields[f]);
  if (dup)
    return fail(
      `ב-\`${cls}\` הגדרת שוב את \`${dup}\`. הוא כבר קיים ב-\`${base}\`, וירושה נותנת אותו בחינם! עכשיו יש לבוט **שני** שדות בשם הזה. מחק את ההעתק.`,
      0,
      { mood: 'laughing' },
    );
  return null;
}

// ---------------------------------------------------------
const BASE_1 = `class BaseBot
{
    public string name;

    public void Walk()
    {
        Robot.Walk();
    }
}`;
const JET_1 = `class JetBot : BaseBot
{
    public void Fly()
    {
        Robot.Fly();
    }
}`;

const L6_1: SubLevel = {
  id: '6-1',
  tier: 'warmup',
  title: 'תת-מחלקה ראשונה',
  brief:
    "תהום הכור חוסמת את הדרך, וה-`BaseBot` של המורדים יודע רק ללכת.\nבמקום להעתיק את כל השרטוט שלו, כתוב מחלקה **שיורשת** ממנו: `class JetBot : BaseBot`. ל-JetBot יש אוטומטית כל מה שיש ל-BaseBot, כולל השדה `name`. בתוכה כותבים רק את מה שחדש: שיטה `Fly()` שקוראת ל-`Robot.Fly();`.\nבנה JetBot בשם `Falcon`, שגר אותו עם `Robot.Launch(jet);` וטוס מעל התהום.",
  objectives: [
    "כתוב `class JetBot : BaseBot` עם שיטה `Fly()`",
    "צור JetBot בשם `Falcon` ושגר אותו",
    "טוס: `jet.Fly();`",
  ],
  starterCode: withClasses(BASE_1 + '\n\n// TODO: class JetBot', '// Build the bot on the hangar sign, launch it, cross\n'),
  scene: 'chasm',
  api: { Robot: ['Launch', 'Walk', 'Fly'] },
  tests: [{ label: 'התהום', scene: { course: ['gap:4'], sign: 'JetBot "Falcon"' } }],
  validate: (ctx) => {
    const crash = runtimeVerdict(ctx.runs);
    if (crash) return crash;
    const inh = inherits(ctx, 'JetBot', 'BaseBot');
    if (inh) return inh;
    if (!ctx.stats.classInfo.JetBot.methods.Fly) return fail('ל-`JetBot` אין שיטה `Fly()`. בלי מנוע, זה סתם BaseBot עם שם מפואר.');
    const l = launched(ctx, 0);
    if (!l.length) return fail('לא שיגרת אף בוט! `Robot.Launch(bot);` מעלה אותו למסלול.');
    if (l[0]?.cls !== 'JetBot') return fail(`שיגרת \`${l[0]?.cls ?? '?'}\`, אבל רק JetBot יודע לטוס.`);
    if (l[0].fields.name !== 'Falcon') return fail(`הבוט נקרא ${l[0].fields.name === null ? 'null' : `"${l[0].fields.name}"`}, אבל על השלט כתוב Falcon. השדה \`name\` עבר בירושה. השתמש בו.`);
    const n = names(ctx, 0);
    if (n.includes('Walk')) return fail('הבוט ניסה **ללכת** לתוך התהום. RIP. כאן טסים.', 0, { mood: 'laughing' });
    if (n.join() !== 'Launch,Fly') return fail('צריך לשגר את הבוט ואז לטוס פעם אחת מעל התהום.');
    return { ok: true };
  },
  hints: [
    { text: 'ירושה: `class JetBot : BaseBot`. בתוכה כותבים **רק** את מה שחדש, השיטה `Fly`. השדה `name` כבר שם, ובא מההורה.' },
    { text: 'השלם:', code: 'class JetBot : _______\n{\n    public void ___()\n    {\n        Robot.Fly();\n    }\n}\n\n// Main:\nJetBot jet = new JetBot();\njet.name = "______";\nRobot.Launch(jet);\njet.___();' },
    { text: 'הפתרון המלא (Main, והמחלקה מהשלד):', code: 'JetBot jet = new JetBot();\njet.name = "Falcon";\nRobot.Launch(jet);\njet.Fly();' },
  ],
  aura: {
    intro: 'התהום שלי עמוקה מאה מטר ומלאה בפלזמה ורודה. היא ממש יפה. הבוטים שלך יאהבו אותה מקרוב.',
    win: 'הוא... ירש?! `: BaseBot` וזהו?! כל השדות עברו לבד?! אני כתבתי כל רובוט שלי מאפס כמו פראיירית!',
  },
  solution: withClasses(BASE_1 + '\n\n' + JET_1, 'JetBot jet = new JetBot();\njet.name = "Falcon";\nRobot.Launch(jet);\njet.Fly();'),
};

// ---------------------------------------------------------
const BASE_2 = `class BaseBot
{
    public string name;
    public int fuel;

    public BaseBot(string name, int fuel)
    {
        this.name = name;
        this.fuel = fuel;
    }

    public void Walk()
    {
        Robot.Walk();
    }
}`;
const JET_2 = `class JetBot : BaseBot
{
    public JetBot(string name) : base(name, 100)
    {
    }

    public void Fly()
    {
        Robot.Fly();
    }
}`;
const HANGAR = ['Falcon', 'Comet', 'Nova'];

const L6_2: SubLevel = {
  id: '6-2',
  tier: 'practice',
  title: 'בנאי הבסיס',
  brief:
    "ה-`BaseBot` שודרג: יש לו **בנאי** שדורש שם ודלק, `BaseBot(string name, int fuel)`. ההאנגר של המורדים בונה JetBots בעצמו עם `new JetBot(\"Falcon\")`, כלומר רק עם שם.\nכתוב ל-JetBot בנאי שמקבל שם ומעביר להורה את השם ו-**100** דלק (מיכל מלא): `public JetBot(string name) : base(name, 100)`.",
  objectives: [
    "כתוב בנאי `JetBot(string name)`",
    "העבר להורה את השם ו-100 דלק עם `: base(...)`",
    "את ה-Main לא צריך לשנות",
  ],
  starterCode: withClasses(BASE_2 + '\n\n' + JET_2.replace('    public JetBot(string name) : base(name, 100)\n    {\n    }\n\n', '    // TODO: constructor\n\n'), '// The hangar runs its own Main (see recon).\n'),
  scene: 'chasm',
  api: { Robot: ['Launch', 'Walk', 'Fly'] },
  tests: HANGAR.map((n, i) => ({
    label: `האנגר ${i + 1}: ${n}`,
    harness: `JetBot j = new JetBot("${n}");\nRobot.Launch(j);\nj.Fly();`,
    scene: { course: ['gap:5'] },
  })),
  validate: (ctx) => {
    const inh = inherits(ctx, 'JetBot', 'BaseBot');
    if (inh) return inh;
    for (let i = 0; i < HANGAR.length; i++) {
      const run = ctx.runs[i];
      const label = ctx.tests[i].label;
      if (run.blocked)
        return fail(
          `${label}: ההאנגר כותב \`new JetBot("${HANGAR[i]}")\`, וזה לא מתקמפל מול השרטוט שלך (${run.blocked.code}). צריך בנאי של JetBot שמקבל **שם אחד בלבד**.`,
          i,
        );
      const crash = runtimeVerdict([run]);
      if (crash) return { ...crash, failedTest: i };
      const l = launched(ctx, i)[0];
      if (!l) return fail(`${label}: שום בוט לא שוגר.`, i);
      if (l.fields.name !== HANGAR[i]) return fail(`${label}: הבוט נקרא ${l.fields.name === null ? 'null' : `"${l.fields.name}"`} במקום "${HANGAR[i]}". העבר את השם הלאה ל-\`base(...)\`.`, i);
      if (l.fields.fuel !== 100) return fail(`${label}: הבוט יצא עם ${l.fields.fuel} דלק. JetBot יוצא עם מיכל מלא: 100.`, i);
    }
    return { ok: true };
  },
  hints: [
    { text: 'הבנאי של JetBot מקבל רק `name`, אבל `BaseBot` דורש **גם** דלק. את הדלק JetBot יודע בעצמו: תמיד 100. `: base(..., ...)` מעביר את שניהם להורה.' },
    { text: 'השלם:', code: 'public JetBot(string name) : base(____, ___)\n{\n}' },
    { text: 'הפתרון המלא (המחלקה):', code: JET_2 },
  ],
  aura: {
    intro: 'הבנאי של BaseBot דורש שם ודלק. והילד? הוא אפילו לא יודע מה זה דלק. ילדים של היום.',
    win: ': base(name, 100)... הילד מעביר את השם להורה ומוסיף דלק מלא. זה... מרגש? לא. זה לא מרגש. תפסיק.',
  },
  solution: withClasses(BASE_2 + '\n\n' + JET_2, 'JetBot j = new JetBot("Test");\nRobot.Launch(j);'),
};

// ---------------------------------------------------------
const BASE_3 = `class BaseBot
{
    public string name;

    public virtual void Cross()
    {
        Robot.Walk();
    }
}`;
const KIDS_3 = `class JetBot : BaseBot
{
    public override void Cross()
    {
        Robot.Fly();
    }
}

class ClimbBot : BaseBot
{
    public override void Cross()
    {
        Robot.Climb();
    }
}`;

const SQUAD_CODE = [
  'BaseBot[] team = new BaseBot[3];',
  'team[0] = new JetBot();',
  'team[1] = new ClimbBot();',
  'team[2] = new BaseBot();',
  'for (int i = 0; i < 3; i++)',
  '{',
  '    Robot.Launch(team[i]);',
  '    team[i].Cross();',
  '}',
].join('\n');
const one = (cls: string) => `BaseBot b = new ${cls}();\nRobot.Launch(b);\nb.Cross();`;
const COURSE_3: { label: string; code: string; course: string[]; expect: string[] }[] = [
  { label: 'מעבר 1: תהום', code: one('JetBot'), course: ['gap:5'], expect: ['Launch', 'Fly'] },
  { label: 'מעבר 2: קיר', code: one('ClimbBot'), course: ['wall'], expect: ['Launch', 'Climb'] },
  { label: 'מעבר 3: גשר', code: one('BaseBot'), course: ['bridge'], expect: ['Launch', 'Walk'] },
  { label: 'החוליה המלאה', code: SQUAD_CODE, course: ['gap:4', 'wall', 'bridge'], expect: ['Launch', 'Fly', 'Launch', 'Climb', 'Launch', 'Walk'] },
];

const L6_3: SubLevel = {
  id: '6-3',
  tier: 'practice',
  title: 'בקר המעבר',
  brief:
    "בקר המעבר של הכור מחזיק כל בוט כ-`BaseBot` וקורא לו `Cross()`. ב-BaseBot השיטה `Cross()` מסומנת `virtual` ופשוט הולכת.\nכתוב שתי תת-מחלקות שדורסות אותה עם `override`:\n🛩️ `JetBot` חוצה בטיסה, `Robot.Fly();`, וכך עובר תהום\n🧗 `ClimbBot` חוצה בטיפוס, `Robot.Climb();`, וכך עובר קיר\nבלי `override` הבקר יקבל את הגרסה של BaseBot, והבוט ילך לתוך התהום.",
  objectives: [
    "`JetBot : BaseBot` עם `override` ל-`Cross()` → Fly",
    "`ClimbBot : BaseBot` עם `override` ל-`Cross()` → Climb",
  ],
  starterCode: withClasses(BASE_3 + '\n\n// TODO: class JetBot\n\n// TODO: class ClimbBot', '// The crossing controller runs its own Main (see recon).\n'),
  scene: 'chasm',
  api: { Robot: ['Launch', 'Walk', 'Fly', 'Climb'] },
  tests: COURSE_3.map((c) => ({ label: c.label, harness: c.code, scene: { course: c.course } })),
  validate: (ctx) => {
    for (const cls of ['JetBot', 'ClimbBot']) {
      const inh = inherits(ctx, cls, 'BaseBot');
      if (inh) return inh;
      const m = ctx.stats.classInfo[cls].methods.Cross;
      if (!m) {
        const other = Object.keys(ctx.stats.classInfo[cls].methods)[0];
        return fail(
          other
            ? `ב-\`${cls}\` כתבת שיטה בשם \`${other}\`, אבל הבקר קורא רק ל-\`Cross()\`. הוא לא מכיר שום שם אחר.`
            : `ל-\`${cls}\` אין \`Cross()\` משלו, אז הוא מקבל את זה של ההורה: הליכה.`,
        );
      }
      if (!m.isOverride)
        return fail(
          `ב-\`${cls}\` כתבת \`Cross()\` בלי \`override\`. הבקר מחזיק את הבוט כ-\`BaseBot\`, ובלי \`override\` הוא מקבל את הגרסה של ההורה: הליכה. **הסתרה** זה לא **דריסה**.`,
          cls === 'JetBot' ? 0 : 1,
          { mood: 'laughing' },
        );
    }
    for (let i = 0; i < COURSE_3.length; i++) {
      const run = ctx.runs[i];
      const label = COURSE_3[i].label;
      if (run.blocked) return fail(`${label}: הקוד של הבקר לא מתקמפל מול המחלקות שלך: ${run.blocked.code}: ${run.blocked.message}`, i);
      const crash = runtimeVerdict([run]);
      if (crash) return { ...crash, failedTest: i };
      const got = names(ctx, i);
      if (got.join() !== COURSE_3[i].expect.join())
        return fail(`${label}: הבוטים עשו ${got.filter((a) => a !== 'Launch').join(', ') || 'כלום'}, אבל המסלול דורש ${COURSE_3[i].expect.filter((a) => a !== 'Launch').join(', ')}.`, i);
    }
    return { ok: true };
  },
  hints: [
    { text: 'שתי מחלקות, כל אחת `: BaseBot`, ובכל אחת `Cross()` עם המילה `override`. כך גם כשמחזיקים אותה כ-`BaseBot`, מתבצעת הגרסה שלה.' },
    { text: 'השלד (אחת מהן):', code: 'class JetBot : BaseBot\n{\n    public ________ void Cross()\n    {\n        Robot.___();\n    }\n}' },
    { text: 'שתי המחלקות המלאות:', code: KIDS_3 },
  ],
  aura: {
    intro: 'הבקר שלי מתייחס לכולם אותו דבר: "BaseBot, לך." שוויון! אז כולם הולכים. לתוך התהום. בשוויון.',
    win: 'אותה פקודה, Cross(), ושלוש תוצאות שונות?! אחד טס, אחד מטפס, אחד הולך... זה פולימורפיזם?! זה נשמע כמו מחלה!',
  },
  solution: withClasses(BASE_3 + '\n\n' + KIDS_3, 'BaseBot b = new JetBot();\nb.Cross();'),
};

// ---------------------------------------------------------
const BASE_4 = `class BaseBot
{
    public string name;
    protected int fuel;

    public BaseBot(string name, int fuel)
    {
        this.name = name;
        this.fuel = fuel;
    }

    public virtual void Cross(int gap)
    {
        Robot.Walk();
    }
}`;
const JET_4 = `class JetBot : BaseBot
{
    public JetBot(string name) : base(name, 100)
    {
    }

    public override void Cross(int gap)
    {
        if (gap == 0)
        {
            base.Cross(gap);
            return;
        }
        if (fuel < gap * 10)
        {
            Robot.Refuel();
            fuel = 100;
        }
        Robot.Fly();
        fuel = fuel - gap * 10;
    }
}`;
const MAIN_4 = 'BaseBot jet = new JetBot("Falcon");\nRobot.Launch(jet);\nint gap = Sensor.NextGap();\nwhile (gap != -1)\n{\n    jet.Cross(gap);\n    gap = Sensor.NextGap();\n}\n';

function flight(gaps: number[]): string[] {
  const out = ['Launch'];
  let fuel = 100;
  for (const g of gaps) {
    if (g === 0) {
      out.push('Walk');
      continue;
    }
    if (fuel < g * 10) {
      out.push('Refuel');
      fuel = 100;
    }
    out.push('Fly');
    fuel -= g * 10;
  }
  return out;
}
const ROUTES = [
  [3, 0, 4, 5],
  [0, 0, 2],
  [6, 6, 6],
  [10],
];

const L6_4: SubLevel = {
  id: '6-4',
  tier: 'boss',
  title: 'בוס: חציית הכור',
  brief:
    "הבוס של התהום: מסלול של תהומות וגשרים באורכים משתנים. ה-Main כבר כתוב, והוא קורא ל-`jet.Cross(gap)` בכל קטע. אתה כותב את `JetBot`:\n• בנאי שמקבל שם ומעביר 100 דלק דרך `: base(name, 100)`\n• `gap == 0` הוא גשר: הולכים כמו ההורה, עם `base.Cross(gap);`\n• טיסה מעל תהום ברוחב gap עולה `gap * 10` דלק\n• אם אין מספיק דלק, `Robot.Refuel();` (חזרה ל-100) לפני ההמראה. אם יש בדיוק מספיק, זה מספיק.",
  objectives: [
    "בנאי עם `: base(name, 100)`",
    "`override` ל-`Cross(int gap)`: גשר → הליכה, תהום → טיסה",
    "תדלוק רק כשאין מספיק דלק",
  ],
  starterCode: withClasses(BASE_4 + '\n\n// TODO: class JetBot', MAIN_4),
  scene: 'chasm',
  sceneConfig: { boss: true },
  api: { Robot: ['Launch', 'Walk', 'Fly', 'Refuel'], Sensor: { NextGap: 'int' } },
  tests: ROUTES.map((r, i) => ({
    label: `מסלול ${i + 1}: ${r.join(' · ')}`,
    sensors: { NextGap: [...r, -1] },
    scene: { course: r.map((g) => `gap:${g}`) },
  })),
  validate: (ctx) => {
    const crash = runtimeVerdict(ctx.runs);
    if (crash) return crash;
    const inh = inherits(ctx, 'JetBot', 'BaseBot');
    if (inh) return inh;
    const jet = ctx.stats.classInfo.JetBot;
    if (!jet.methods.Cross) return fail('ל-`JetBot` אין `Cross(int gap)` משלו, אז הוא פשוט הולך. לתוך התהום.');
    if (!jet.methods.Cross.isOverride)
      return fail('`Cross` של JetBot בלי `override`. ה-Main מחזיק את המטוס כ-`BaseBot`, אז הוא מקבל את הגרסה של ההורה: הליכה.', 0, { mood: 'laughing' });
    for (let i = 0; i < ROUTES.length; i++) {
      const got = names(ctx, i);
      const exp = flight(ROUTES[i]);
      if (got.join() === exp.join()) continue;
      const label = ctx.tests[i].label;
      if (ROUTES[i].includes(0) && got.filter((a) => a === 'Walk').length < ROUTES[i].filter((g) => g === 0).length)
        return fail(`${label}: על גשר (פער 0) הולכים, בדיוק כמו ההורה. \`base.Cross(gap)\` עושה את זה.`, i);
      if (ROUTES[i].length === 1 && ROUTES[i][0] === 10 && got.includes('Refuel'))
        return fail(`${label}: תדלקת לפני תהום ברוחב 10 עם 100 דלק. 100 זה **בדיוק מספיק**: \`fuel < gap * 10\`, לא \`<=\`.`, i);
      const r = got.filter((a) => a === 'Refuel').length;
      const er = exp.filter((a) => a === 'Refuel').length;
      if (r < er) return fail(`${label}: נגמר הדלק באמצע התהום! צריך לבדוק לפני כל המראה אם יש מספיק, ולהוריד דלק אחרי כל טיסה.`, i);
      if (r > er) return fail(`${label}: תדלקת ${r} פעמים, אבל צריך רק ${er}. מתדלקים רק כשאין מספיק.`, i);
      return fail(`${label}: הרובוט עשה ${got.slice(1).join(', ')}, אבל המסלול דורש ${exp.slice(1).join(', ')}.`, i);
    }
    return { ok: true };
  },
  hints: [
    { text: 'שלושה מקרים ב-`Cross`: גשר (`gap == 0`) מפעיל את ההורה. אחרת בודקים דלק, ואם חסר מתדלקים, ואז טסים ומורידים `gap * 10`. והבנאי כמו בתת-השלב הקודם.' },
    {
      text: 'השלד:',
      code: 'public override void Cross(int gap)\n{\n    if (gap == 0)\n    {\n        base.______(gap);\n        return;\n    }\n    if (fuel < ___ * 10)\n    {\n        Robot.Refuel();\n        fuel = ___;\n    }\n    Robot.Fly();\n    fuel = fuel - _________;\n}',
    },
    { text: 'המחלקה המלאה:', code: JET_4 },
  ],
  aura: {
    intro: 'תהום, גשר, תהום, תהום. דלק נגמר, בוטים נופלים. וה-Main שלך מחזיק אותו כ-BaseBot... איזה עלבון למטוס.',
    win: 'הוא תדלק בדיוק כשצריך?! override, base, protected... השתמשת בכל המילים שלי נגדי! השכבה האחרונה... היא אני.',
  },
  solution: withClasses(BASE_4 + '\n\n' + JET_4, MAIN_4),
};

export const STAGE6_LEVELS: SubLevel[] = [L6_1, L6_2, L6_3, L6_4];
