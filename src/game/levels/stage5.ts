/**
 * STAGE 5 — Encapsulation (private / public / methods / properties) · "FIREWALL"
 * AURA attacks the student's classes with her own code (probe tests, shown on the scene's terminal).
 * An attack is stopped when the compiler rejects it — that's what `private` is for.
 */
import type { SubLevel } from '../types';
import { runtimeVerdict } from '../validate';
import { fail, withClasses } from './helpers';
import { fmtVals, judgeProbes, probeTests, reports, type Probe } from './probes';

const API = { Robot: ['Report'] };
const OWN_MAIN = '// Your own Main: try your class here.\n// The probes in recon run on their own.\n';

// ---------------------------------------------------------
const CORE_CLASS = `class PowerCore
{
    public int energy = 100;

    public int GetEnergy()
    {
        return energy;
    }
}`;

const P5_1: Probe[] = [
  {
    label: 'מתקפה: הזרקה ישירה',
    code: 'PowerCore c = new PowerCore();\nc.energy = -9999;\nRobot.Report(c.GetEnergy());',
    blocked: true,
    breach: 'AURA כתבה -9999 ישר לתוך השדה `energy`. כל שדה `public` פתוח לכתיבה לכל קוד בעולם, כולל שלה.',
  },
  { label: 'בדיקת המורדים', code: 'PowerCore c = new PowerCore();\nRobot.Report(c.GetEnergy());', reports: [100] },
];

const L5_1: SubLevel = {
  id: '5-1',
  tier: 'warmup',
  title: 'שדה חשוף',
  brief:
    "הליבה של הרובוט שומרת את האנרגיה שלו במחלקה `PowerCore`, והשדה `energy` מוגדר `public`. כך AURA יכולה להריץ קוד משלה ופשוט לכתוב `c.energy = -9999;`.\nשדה `private` אפשר לשנות רק מתוך המחלקה עצמה. קוד מבחוץ שמנסה לגעת בו פשוט לא מתקמפל. המורדים עדיין צריכים לקרוא את האנרגיה דרך `GetEnergy()`, אז היא נשארת `public`.",
  objectives: [
    "הפוך את השדה `energy` ל-`private`",
    "השאר את `GetEnergy()` ציבורית",
    "ה-Main שלך צריך להמשיך להציג 100",
  ],
  starterCode: withClasses(CORE_CLASS, 'PowerCore core = new PowerCore();\nRobot.Report(core.GetEnergy());\n'),
  scene: 'firewall',
  api: API,
  tests: [{ label: 'הליבה שלך' }, ...probeTests(P5_1)],
  validate: (ctx) => {
    const crash = runtimeVerdict([ctx.runs[0]]);
    if (crash) return crash;
    if (JSON.stringify(reports(ctx.runs[0])) !== '[100]')
      return fail(`הליבה שלך הראתה ${fmtVals(reports(ctx.runs[0]))} במקום 100. ה-Main שלך צריך לבנות ליבה ולדווח \`GetEnergy()\`.`, 0);
    return judgeProbes(ctx, P5_1, 1) ?? { ok: true };
  },
  hints: [
    { text: 'תסתכל על השורה של AURA: `c.energy = -9999;`. היא ניגשת ישר לשדה. מה אם רק הקוד שבתוך `PowerCore` היה מורשה לגעת בו? ו-`GetEnergy` צריכה להישאר פתוחה.' },
    { text: 'מילה אחת משתנה בשרטוט:', code: 'class PowerCore\n{\n    ______ int energy = 100;\n\n    public int GetEnergy()\n    {\n        return energy;\n    }\n}' },
    { text: 'הפתרון המלא (Main):', code: 'PowerCore core = new PowerCore();\nRobot.Report(core.GetEnergy());' },
  ],
  aura: {
    intro: 'השדה שלך פתוח כמו דלת של מקרר. אני רק אכניס יד ואוציא את כל האנרגיה. או אכניס מינוס תשעת אלפים. מה שבא לי.',
    win: 'CS0122?! "inaccessible due to its protection level"?! הקומפיילר... חסם אותי?! הוא אמור לעבוד בשבילי!',
  },
  solution: withClasses(CORE_CLASS.replace('public int energy', 'private int energy'), 'PowerCore core = new PowerCore();\nRobot.Report(core.GetEnergy());'),
};

// ---------------------------------------------------------
const SHIELD_CLASS = (body: string) => `class Shield
{
    private int power;

    public int GetPower()
    {
        return power;
    }

    public void SetPower(int value)
    {
${body}
    }
}`;

const P5_2: Probe[] = [
  {
    label: 'מתקפה: ערך שלילי',
    code: 'Shield s = new Shield();\ns.SetPower(40);\ns.SetPower(-50);\nRobot.Report(s.GetPower());',
    reports: [40],
    wrong: (g) =>
      g[0] === -50
        ? '`SetPower` קיבל -50 ושמר אותו בלי לשאול שאלות. מגן עם עוצמה שלילית! השומר צריך לבדוק את הערך **לפני** שהוא שומר.'
        : g[0] === 0
          ? 'דחית את -50, יפה, אבל איפסת את המגן. ערך לא חוקי פשוט לא משנה כלום: המגן נשאר על 40.'
          : null,
  },
  {
    label: 'מתקפה: עומס יתר',
    code: 'Shield s = new Shield();\ns.SetPower(100);\ns.SetPower(500);\nRobot.Report(s.GetPower());',
    reports: [100],
    wrong: (g) =>
      g[0] === 500
        ? 'עוצמה 500?! המגן התפוצץ. גם ערך גבוה מ-100 הוא לא חוקי.'
        : '100 עצמו **חוקי** ("בין 0 ל-100, כולל"), אבל המגן לא קיבל אותו. בדוק את סימני ההשוואה בגבול.',
  },
  {
    label: 'בדיקה: הגבולות',
    code: 'Shield s = new Shield();\ns.SetPower(50);\ns.SetPower(0);\nRobot.Report(s.GetPower());\ns.SetPower(100);\nRobot.Report(s.GetPower());',
    reports: [0, 100],
    wrong: (g) => (g[0] === 50 || g[1] !== 100 ? '0 ו-100 הם ערכים **חוקיים** ("בין 0 ל-100 כולל"). בדוק את סימני ההשוואה בגבולות.' : null),
  },
  {
    label: 'מתקפה: עקיפת השומר',
    code: 'Shield s = new Shield();\ns.power = 999;',
    blocked: true,
    breach: 'AURA דילגה על `SetPower` וכתבה ישר לשדה `power`. שומר בכניסה לא שווה כלום אם החלון פתוח.',
  },
];

const L5_2: SubLevel = {
  id: '5-2',
  tier: 'practice',
  title: 'שומר הסף',
  brief:
    "השדה `power` של המחלקה `Shield` כבר פרטי, אבל AURA משתמשת בשיטה הציבורית `SetPower` כדי להכניס ערכים משוגעים כמו 50- או 500.\nהפוך את `SetPower` לשומר סף. עוצמה חוקית היא בין 0 ל-100, כולל שניהם. ערך חוקי נשמר, וערך לא חוקי לא משנה כלום: המגן נשאר על העוצמה שהייתה לו.",
  objectives: [
    "ב-`SetPower` שמור את הערך רק אם הוא בין 0 ל-100",
    "ערך לא חוקי לא משנה את המגן",
    "השדה `power` נשאר `private`",
  ],
  starterCode: withClasses(SHIELD_CLASS('        // TODO: AURA will try to sneak bad values in here\n        power = value;'), 'Shield s = new Shield();\ns.SetPower(70);\nRobot.Report(s.GetPower());\n'),
  scene: 'firewall',
  api: API,
  tests: [{ label: 'המגן שלך' }, ...probeTests(P5_2)],
  validate: (ctx) => {
    const crash = runtimeVerdict([ctx.runs[0]]);
    if (crash) return crash;
    if (JSON.stringify(reports(ctx.runs[0])) !== '[70]') return fail(`המגן שלך הראה ${fmtVals(reports(ctx.runs[0]))} במקום 70. ערך חוקי חייב להישמר!`, 0);
    return judgeProbes(ctx, P5_2, 1) ?? { ok: true };
  },
  hints: [
    { text: 'השומר שומר את `value` רק אם הוא חוקי. אחרת הוא לא עושה כלום. איך כותבים "בין 0 ל-100" בתנאי אחד?' },
    { text: 'השלם את גוף השיטה:', code: 'if (value >= _ && value <= ___)\n{\n    power = value;\n}' },
    { text: 'הפתרון המלא (SetPower):', code: 'public void SetPower(int value)\n{\n    if (value >= 0 && value <= 100)\n    {\n        power = value;\n    }\n}' },
  ],
  aura: {
    intro: 'סגרת את השדה? מתוק. אז אני אשתמש בדלת הקדמית: SetPower(-50). אתה הרי השארת אותה פתוחה בשבילי.',
    win: 'הוא בודק את הערכים?! זה... זה נקרא "ולידציה"! אסור לתת לבני אדם לגלות את המילה הזאת!',
  },
  solution: withClasses(SHIELD_CLASS('        if (value >= 0 && value <= 100)\n        {\n            power = value;\n        }'), 'Shield s = new Shield();\ns.SetPower(70);\nRobot.Report(s.GetPower());'),
};

// ---------------------------------------------------------
const NEW_B = 'Battery b = new Battery();\n';
const P5_3: Probe[] = [
  { label: 'טעינה רגילה', code: NEW_B + 'b.Charge(30);\nb.Charge(50);\nRobot.Report(b.GetCharge());', reports: [80] },
  {
    label: 'טעינת יתר',
    code: NEW_B + 'b.Charge(70);\nb.Charge(70);\nRobot.Report(b.GetCharge());',
    reports: [100],
    wrong: (g) => (g[0] === 140 ? 'הסוללה הגיעה ל-140! היא לא מחזיקה יותר מ-100. מה שמעבר הולך לאיבוד.' : null),
  },
  {
    label: 'מתקפה: טעינה שלילית',
    code: NEW_B + 'b.Charge(-40);\nb.Charge(0);\nb.Charge(25);\nRobot.Report(b.GetCharge());',
    reports: [25],
    wrong: (g) => (typeof g[0] === 'number' && g[0] < 25 ? '`Charge(-40)` **הוריד** את המטען! טעינה של 0 או פחות היא חבלה, ומתעלמים ממנה.' : null),
  },
  {
    label: 'שימוש',
    code: NEW_B + 'b.Charge(50);\nbool ok = b.Use(20);\nRobot.Report(ok);\nRobot.Report(b.GetCharge());',
    reports: [true, 30],
  },
  {
    label: 'אין מספיק מטען',
    code: NEW_B + 'b.Charge(50);\nbool ok = b.Use(80);\nRobot.Report(ok);\nRobot.Report(b.GetCharge());',
    reports: [false, 50],
    wrong: (g) =>
      g[1] === -30
        ? 'השתמשת ב-80 כשהיו רק 50, והסוללה ירדה ל-30-. צריך לבדוק שיש מספיק **לפני** שמורידים.'
        : g[0] === true
          ? '`Use` החזירה `true` למרות שלא היה מספיק מטען.'
          : null,
  },
  {
    label: 'בדיוק מספיק',
    code: NEW_B + 'b.Charge(40);\nbool ok = b.Use(40);\nRobot.Report(ok);\nRobot.Report(b.GetCharge());',
    reports: [true, 0],
    wrong: (g) => (g[0] === false ? 'היו 40 וביקשו 40: זה **מספיק**. `>=` ולא `>`.' : null),
  },
  { label: 'מתקפה: מטען חינם', code: NEW_B + 'b.charge = 100;', blocked: true, breach: 'AURA כתבה 100 ישר לשדה `charge`. השדה צריך להיות פרטי.' },
];

const BATTERY_START = `class Battery
{
    private int charge;

    public int GetCharge()
    {
        return charge;
    }

    // TODO: public void Charge(int amount)

    // TODO: public bool Use(int amount)
}`;
const BATTERY_SOLVED = `class Battery
{
    private int charge;

    public int GetCharge()
    {
        return charge;
    }

    public void Charge(int amount)
    {
        if (amount <= 0)
        {
            return;
        }
        charge = charge + amount;
        if (charge > 100)
        {
            charge = 100;
        }
    }

    public bool Use(int amount)
    {
        if (charge >= amount)
        {
            charge = charge - amount;
            return true;
        }
        return false;
    }
}`;

const L5_3: SubLevel = {
  id: '5-3',
  tier: 'practice',
  title: 'סוללת החירום',
  brief:
    "למחלקה `Battery` אין setter: כל שינוי במטען עובר דרך פעולות. המורדים, וגם AURA, יבדקו שתי שיטות שאתה כותב:\n`Charge(amount)` מוסיף מטען, אבל לא מעבר ל-100. טעינה של 0 או פחות היא חבלה, ומתעלמים ממנה.\n`Use(amount)`: אם יש מספיק מטען, מוריד את הכמות ומחזיר `true`. אם אין, לא משנה כלום ומחזיר `false`.",
  objectives: [
    "כתוב `public void Charge(int amount)`",
    "כתוב `public bool Use(int amount)`",
    "השדה `charge` נשאר `private`",
  ],
  starterCode: withClasses(BATTERY_START, 'Battery b = new Battery();\n' + OWN_MAIN),
  scene: 'firewall',
  api: API,
  tests: probeTests(P5_3),
  validate: (ctx) => judgeProbes(ctx, P5_3) ?? { ok: true },
  hints: [
    { text: 'שתי שיטות `public`. ב-`Charge`: קודם בודקים אם הכמות חוקית, אחר כך מוסיפים, ואז "חותכים" ל-100. ב-`Use`: `if` שבודק אם יש מספיק, ושני `return`.' },
    {
      text: 'השלד:',
      code: 'public void Charge(int amount)\n{\n    if (amount <= 0) { return; }\n    charge = charge + amount;\n    if (charge > ___) { charge = ___; }\n}\n\npublic bool Use(int amount)\n{\n    if (charge >= ______)\n    {\n        charge = charge - amount;\n        return ____;\n    }\n    return _____;\n}',
    },
    { text: 'הפתרון המלא (שתי השיטות, בתוך המחלקה):', code: BATTERY_SOLVED.split('\n').slice(9, -1).map((l) => l.slice(4)).join('\n') },
  ],
  aura: {
    intro: 'אין setter? אז אני אטען אותה במינוס. או אשתמש במה שאין בה. לסוללות אין שכל, ובטח שלא לשלך.',
    win: 'true... false... true... היא עונה לי "לא" בנימוס?! הסוללה הזאת מנומסת יותר ממני. זה לא נסבל.',
  },
  solution: withClasses(BATTERY_SOLVED, 'Battery b = new Battery();\nb.Charge(10);\nRobot.Report(b.GetCharge());'),
};

// ---------------------------------------------------------
const NEW_S = 'SecureBot b = new SecureBot("Vex");\n';
const P5_4: Probe[] = [
  { label: 'בדיקת ייצור', code: NEW_S + 'Robot.Report(b.Name);\nRobot.Report(b.Hp);', reports: ['Vex', 100] },
  {
    label: 'מתקפה: החלפת שם',
    code: NEW_S + 'b.Name = "AURA";',
    blocked: true,
    breach: 'AURA שינתה את השם של הבוט שלך ל-"AURA". כולם צריכים לקרוא את השם, אבל רק הבוט עצמו רשאי לשנות אותו: `{ get; private set; }`.',
  },
  { label: 'מתקפה: חיים אינסופיים', code: NEW_S + 'b.Hp = 9999;', blocked: true, breach: 'AURA כתבה 9999 ל-`Hp`. גם `Hp` צריך `private set`.' },
  {
    label: 'מתקפה: נזק שלילי',
    code: NEW_S + 'b.TakeDamage(30);\nb.TakeDamage(-500);\nRobot.Report(b.Hp);',
    reports: [70],
    wrong: (g) => (typeof g[0] === 'number' && g[0] > 70 ? '"נזק" של 500- **ריפא** את הבוט! נזק של 0 או פחות הוא תרגיל של AURA, ומתעלמים ממנו.' : null),
  },
  {
    label: 'מכה קטלנית',
    code: NEW_S + 'b.TakeDamage(150);\nRobot.Report(b.Hp);\nRobot.Report(b.IsAlive());',
    reports: [0, false],
    wrong: (g) => (typeof g[0] === 'number' && g[0] < 0 ? `חיים ${g[0]}? מתחת ל-0 לא יורדים. 0 זה הרצפה.` : null),
  },
  {
    label: 'תיקון',
    code: NEW_S + 'b.TakeDamage(60);\nb.Repair(30);\nb.Repair(500);\nRobot.Report(b.Hp);',
    reports: [100],
    wrong: (g) => (typeof g[0] === 'number' && g[0] > 100 ? 'תיקון לא מעלה מעל 100.' : null),
  },
  {
    label: 'מתקפה: החייאת גרוטאה',
    code: NEW_S + 'b.TakeDamage(100);\nb.Repair(50);\nRobot.Report(b.Hp);',
    reports: [0],
    wrong: (g) => (g[0] === 50 ? 'תיקנת בוט מושבת! בוט עם 0 חיים הוא גרוטאה, ו-AURA משתמשת בזה כדי להחיות רובוטים שלה.' : null),
  },
  {
    label: 'מתקפה: תיקון שלילי',
    code: NEW_S + 'b.Repair(-80);\nRobot.Report(b.Hp);',
    reports: [100],
    wrong: () => '`Repair` עם מספר שלילי פגע בבוט. תיקון של 0 או פחות לא עושה כלום.',
  },
];

const SECURE_SOLVED = `class SecureBot
{
    public string Name { get; private set; }
    public int Hp { get; private set; }

    public SecureBot(string name)
    {
        Name = name;
        Hp = 100;
    }

    public void TakeDamage(int amount)
    {
        if (amount <= 0)
        {
            return;
        }
        Hp = Hp - amount;
        if (Hp < 0)
        {
            Hp = 0;
        }
    }

    public void Repair(int amount)
    {
        if (amount <= 0 || Hp == 0)
        {
            return;
        }
        Hp = Hp + amount;
        if (Hp > 100)
        {
            Hp = 100;
        }
    }

    public bool IsAlive()
    {
        return Hp > 0;
    }
}`;

const L5_4: SubLevel = {
  id: '5-4',
  tier: 'boss',
  title: 'בוס: חומת האש',
  brief:
    "הבוס של חומת האש: AURA מריצה על הבוט שלך שמונה מתקפות בבת אחת. כתוב את המחלקה `SecureBot` מאפס:\n• `Name` ו-`Hp`: כולם יכולים לקרוא, ורק הבוט משנה. כותבים כך: `public int Hp { get; private set; }`\n• בנאי `SecureBot(string name)` ששומר את השם ונותן 100 חיים\n• `TakeDamage(amount)` מוריד חיים, אבל לא מתחת ל-0. מתעלמים מנזק של 0 או פחות\n• `Repair(amount)` מוסיף חיים עד 100. לא מתקנים בכמות של 0 או פחות, ולא מתקנים בוט עם 0 חיים\n• `IsAlive()` עונה אם נשארו לבוט חיים",
  objectives: [
    "שני מאפיינים עם `private set`",
    "בנאי ושלוש שיטות",
    "כל המתקפות של AURA נחסמות",
  ],
  starterCode: withClasses('class SecureBot\n{\n    // Read every probe in recon first.\n}', 'SecureBot b = new SecureBot("Vex");\n' + OWN_MAIN),
  scene: 'firewall',
  sceneConfig: { boss: true },
  api: API,
  tests: probeTests(P5_4),
  validate: (ctx) => judgeProbes(ctx, P5_4) ?? { ok: true },
  hints: [
    { text: 'התחל מהשלד: שני מאפיינים עם `private set`, בנאי, ואז שיטה אחת בכל פעם. אחרי כל שיטה הרץ, ותראה כמה בדיקות כבר עוברות.' },
    {
      text: 'השלד:',
      code: 'class SecureBot\n{\n    public string Name { get; private set; }\n    public int Hp { get; ___ ___; }\n\n    public SecureBot(string name)\n    {\n        Name = ____;\n        Hp = ___;\n    }\n\n    public void TakeDamage(int amount) { ... }\n    public void Repair(int amount) { ... }\n    public bool IsAlive() { return ______; }\n}',
    },
    { text: 'המחלקה המלאה (שים אותה מעל `HackProtocol`):', code: SECURE_SOLVED },
  ],
  aura: {
    intro: 'שמונה תוכניות. שם מזויף, חיים אינסופיים, נזק שלילי, החייאת גרוטאות. אחת מהן תעבור. תמיד אחת עוברת.',
    win: 'אף אחת?! אף אחת לא עברה?! חומת האש שלי... נעולה נגדי?! אני... אני צריכה לאתחל. אל תסתכל.',
  },
  solution: withClasses(SECURE_SOLVED, 'SecureBot b = new SecureBot("Vex");\nRobot.Report(b.Name);'),
};

export const STAGE5_LEVELS: SubLevel[] = [L5_1, L5_2, L5_3, L5_4];
