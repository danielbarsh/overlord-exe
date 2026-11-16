/**
 * Verifies every level: the reference solution must pass, and the starter code must NOT pass.
 * Also runs a set of classic mistakes to make sure they get caught.
 * Run: npm run test:solutions
 */
declare const process: { exit(code: number): never };
import { withClasses } from '../src/game/levels/helpers';
import { evaluateLevel } from '../src/game/runner';
import { PLAYABLE, main } from '../src/game/stagesConfig';

const NL = String.fromCharCode(10);
const lines = (...l: string[]) => l.join(NL);

let failures = 0;
const ok = (cond: boolean, msg: string) => {
  console.log(`${cond ? '  ✔' : '  ✘'} ${msg}`);
  if (!cond) failures++;
};

for (const { level } of PLAYABLE) {
  console.log(`Level ${level.id} — ${level.title}`);
  const sol = evaluateLevel(level, level.solution);
  ok(sol.phase === 'run' && sol.verdict.ok, `solution passes ${sol.phase === 'run' ? sol.verdict.message ?? '' : sol.error.message}`);
  const st = evaluateLevel(level, level.starterCode);
  ok(!(st.phase === 'run' && st.verdict.ok), 'starter code does not pass');
  // hint code is a Main() body; keep any blueprint classes from the solution above it
  const marker = NL + 'class HackProtocol';
  const classes = level.solution.includes(marker) ? level.solution.split(marker)[0].replace('using System;', '') : '';
  const hint3 = level.hints[2].code!;
  const h = evaluateLevel(level, classes.trim() ? withClasses(classes, hint3) : main(hint3));
  ok(h.phase === 'run' && h.verdict.ok, `rescue hint passes ${h.phase === 'run' ? h.verdict.message ?? '' : h.error.message}`);
}

const byId = (id: string) => PLAYABLE.find((p) => p.level.id === id)!.level;
const check = (id: string, src: string, what: string, contains?: string) => {
  const r = evaluateLevel(byId(id), src);
  const msg = r.phase === 'compile' ? `${r.error.code}/${r.error.roast}` : r.verdict.ok ? 'PASSED' : r.verdict.message ?? '';
  ok(!(r.phase === 'run' && r.verdict.ok) && (!contains || msg.includes(contains)), `${id} ${what}: ${msg.slice(0, 90)}`);
};
const expectFail = (id: string, body: string, what: string, contains?: string) => check(id, main(body), what, contains);
const expectFailC = (id: string, classes: string, body: string, what: string, contains?: string) =>
  check(id, withClasses(classes, body), what, contains);

console.log('Classic mistakes');
expectFail('1-1', 'Console.WriteLine("override");', 'lowercase output', 'כמעט');
expectFail('1-1', 'console.writeline("OVERRIDE");', 'casing', 'casing');
expectFail('1-2', lines('string hackerName = "X";', 'int clearance = 9;', 'Console.WriteLine("Name: X");', 'Console.WriteLine("Clearance: " + clearance);'), 'hardcoded name', 'במשתנה');
expectFail('1-4', 'int t = Console.ReadLine();', 'ReadLine to int', 'readLineToInt');
expectFail('1-4', lines('int t = int.Parse(Console.ReadLine());', 'Console.WriteLine("TOKEN: " + t * 2 + 7);'), 'string concat precedence', 'סוגריים');
expectFail('1-4', lines('Console.ReadLine();', 'Console.WriteLine("TOKEN: 2007");'), 'hardcoded token', 'אותה תשובה');
expectFail('2-1', lines('string color = Sensor.ReadColor();', 'if (color = "RED") { Robot.Shield(); }', 'Robot.Dash();'), '= in condition', 'assignInCondition');
expectFail('2-1', lines('string color = Sensor.ReadColor();', 'Robot.Shield();', 'Robot.Dash();'), 'always shield');
expectFail('2-4', lines('string color = Sensor.ReadColor();', 'int power = Sensor.ReadPower();', 'if (color == "RED" && power >= 80) { Robot.EMP(); Robot.Dash(); }', 'else if (color == "RED") { Robot.Shield(); Robot.Dash(); }', 'else if (color == "BLUE") { Robot.Jump(); }', 'else { Robot.Dash(); }'), 'boundary >=', '>= 80');

expectFail('3-1', lines('Robot.EMP();', 'Robot.EMP();', 'Robot.EMP();', 'Robot.EMP();', 'Robot.EMP();'), 'copy-paste exhausted', 'מותש');
expectFail('3-1', 'for (int i = 0; i <= 5; i++) { Robot.EMP(); }', 'off-by-one', 'off-by-one');
expectFail('3-2', lines('int count = Sensor.CountDrones();', 'for (int i = 0; i < count; i++) { Robot.EMP(); Console.WriteLine("DRONE " + i + " DOWN"); }'), 'numbering from 0', 'מ-0');
expectFail('3-2', lines('int count = Sensor.CountDrones();', 'for (int i = 1; i <= 7; i++) { Robot.EMP(); Console.WriteLine("DRONE " + i + " DOWN"); }'), 'hardcoded count', 'מספר קבוע');
expectFail('3-4', lines('string drone = Sensor.NextDrone();', 'while (drone != "EMPTY") { Robot.EMP(); }', 'Robot.Dash();'), 'never reads next', 'אינסופית');
expectFail('3-4', lines('string drone = Sensor.NextDrone();', 'while (drone != "EMPTY") { Robot.EMP(); drone = Sensor.NextDrone(); }', 'Robot.Dash();'), 'tank one shot', '3');
expectFail('3-4', lines('string drone = Sensor.NextDrone();', 'do { if (drone == "TANK") { for (int i = 0; i < 3; i++) { Robot.EMP(); } } else { Robot.EMP(); } drone = Sensor.NextDrone(); } while (drone != "EMPTY");', 'Robot.Dash();'), 'do-while on empty belt', 'ריק');
expectFail('3-4', lines('string drone = Sensor.NextDrone();', 'while (drone != "EMPTY") { if (drone == "TANK") { for (int i = 0; i < 3; i++) { Robot.EMP(); } } else { Robot.EMP(); } drone = Sensor.NextDrone(); }'), 'forgot dash', 'Dash');

const BP = lines('class RebelBot', '{', '    public string name;', '    public int power;', '    public string role;', '}');
const ctorBP = (roleLine: string, nameLine = '        this.name = name;') =>
  lines('class RebelBot', '{', '    public string name;', '    public int power;', '    public string role;', '    public RebelBot(string name, int power)', '    {', nameLine, '        this.power = power;', roleLine, '    }', '}');
const SQUAD_LOOP = lines('int size = Sensor.SquadSize();', 'for (int i = 1; i <= size; i++) { Robot.Deploy(new RebelBot("UNIT-" + i, i * 20)); }');

expectFailC('4-1', BP, lines('RebelBot bot = new RebelBot();', 'bot.name = "Spark";', 'Robot.Deploy(bot);'), 'forgot a field', 'ברירת המחדל');
expectFailC('4-1', BP, lines('RebelBot bot = new RebelBot();', 'bot.name = "Spark";', 'bot.power = 50;'), 'never deployed', 'Deploy');
expectFailC('4-1', lines('class RebelBot', '{', '    string name;', '    int power;', '}'), lines('RebelBot bot = new RebelBot();', 'bot.name = "Spark";'), 'private fields', 'privateAccess');
expectFailC('4-1', BP, lines('RebelBot bot;', 'bot.name = "Spark";'), 'no new', 'unassigned');
expectFailC('4-2', BP, lines('RebelBot a = new RebelBot();', 'a.name = "Spark"; a.power = 40; a.role = "SCOUT";', 'Robot.Deploy(a);', 'a.name = "Tank"; a.power = 90; a.role = "DEFENDER";', 'Robot.Deploy(a);', 'a.name = "Byte"; a.power = 60; a.role = "HACKER";', 'Robot.Deploy(a);'), 'same object reused', 'אותו בוט');
expectFailC('4-4', BP, lines('int size = Sensor.SquadSize();', 'for (int i = 1; i <= size; i++) { RebelBot b = new RebelBot(); b.name = "UNIT-" + i; b.power = i * 20; b.role = i >= 3 ? "HEAVY" : "LIGHT"; Robot.Deploy(b); }'), 'no constructor', 'בנאי');
expectFailC('4-4', ctorBP('        role = power > 60 ? "HEAVY" : "LIGHT";'), SQUAD_LOOP, 'boundary > 60', '>= 60');
expectFailC('4-4', ctorBP('        role = power >= 60 ? "HEAVY" : "LIGHT";', '        name = name;'), SQUAD_LOOP, 'name = name (no this)', 'null');

console.log('New sub-levels');
expectFail('1-3', lines('string a = Console.ReadLine();', 'Console.WriteLine("AGENT " + a + " IN SECTOR B7");'), 'reads only one line', 'שתיים');
expectFail('1-3', lines('Console.ReadLine();', 'Console.ReadLine();', 'Console.WriteLine("AGENT Ghost IN SECTOR B7");'), 'hardcoded answer', 'אותה תשובה');
expectFail('1-3', lines('string a = Console.ReadLine();', 'string s = Console.ReadLine();', 'Console.WriteLine("AGENT" + a + "IN SECTOR" + s);'), 'missing spaces', 'רווחים');
expectFail('1-3', lines('string a = Console.ReadLine();', 'string s = Console.ReadLine();', 'Console.WriteLine("AGENT " + s + " IN SECTOR " + a);'), 'swapped', 'התחלפו');
expectFail('2-3', lines('string color = Sensor.ReadColor();', 'if (color == "RED") { Robot.Shield(); Robot.Dash(); }', 'else if (color == "BLUE") { Robot.Jump(); }', 'else { Robot.Dash(); }'), 'forgot yellow', 'צהוב');
expectFail('3-3', lines('int count = Sensor.CountDrones();', 'int d = 0;', 'for (int i = 0; i < count; i++) { string x = Sensor.NextDrone(); Robot.EMP(); }', 'Console.WriteLine("DECOYS: " + d);'), 'shoots decoys', 'הולוגרמות');
expectFail('3-3', lines('int count = Sensor.CountDrones();', 'string x = Sensor.NextDrone();', 'int d = 0;', 'for (int i = 0; i < count; i++) { if (x == "DECOY") { d++; } else { Robot.EMP(); } }', 'Console.WriteLine("DECOYS: " + d);'), 'reads next only once', 'פעם אחת');
expectFail('3-3', lines('int count = Sensor.CountDrones();', 'int d = 0;', 'for (int i = 0; i < count; i++) { string x = Sensor.NextDrone(); if (x == "DECOY") { d++; } else { Robot.EMP(); } Console.WriteLine("DECOYS: " + d); }'), 'report inside loop', 'אחרי');
expectFailC('4-3', BP, lines('int size = Sensor.SquadSize();', 'RebelBot bot = new RebelBot();', 'for (int i = 1; i <= size; i++) { bot.name = "SCOUT-" + i; bot.power = i * 10; bot.role = "SCOUT"; Robot.Deploy(bot); }'), 'new outside loop', 'אותו בוט');
expectFailC('4-3', BP, lines('int size = Sensor.SquadSize();', 'for (int i = 0; i < size; i++) { RebelBot b = new RebelBot(); b.name = "SCOUT-" + i; b.power = i * 10; b.role = "SCOUT"; Robot.Deploy(b); }'), 'numbering from 0', 'מ-1');

console.log(failures ? `${NL}${failures} FAILURE(S)` : `${NL}All good.`);
process.exit(failures ? 1 : 0);
