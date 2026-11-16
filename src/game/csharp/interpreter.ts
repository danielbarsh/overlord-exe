/**
 * Tree-walking interpreter for the checked C# subset.
 * Produces console output + a log of Robot actions that the canvas animates.
 */
import type { Expr, MethodDecl, Stmt } from './ast';
import type { GameApi } from './builtins';
import type { CheckResult, ClassInfo } from './checker';
import { RuntimeErr } from './errors';

export type Val =
  | { t: 'int'; v: number }
  | { t: 'double'; v: number }
  | { t: 'string'; v: string }
  | { t: 'bool'; v: boolean }
  | { t: 'char'; v: string }
  | { t: 'null' }
  | { t: 'void' }
  | { t: 'cls'; name: string }
  | ObjVal
  | { t: 'arr'; elem: string; items: Val[] };

export interface ObjVal {
  t: 'obj';
  cls: string;
  id: number;
  fields: Map<string, Val>;
}

export type JsVal = string | number | boolean | null;

/** Snapshot of a user object at the moment it was passed to a Robot.X(obj) call */
export interface ObjSnapshot {
  id: number;
  cls: string;
  fields: Record<string, JsVal>;
}

export interface RobotAction {
  name: string;
  args: JsVal[];
  line: number;
  /** per argument: object snapshot if the argument was an object, else null */
  objs: (ObjSnapshot | null)[];
}

export type RunEvent =
  | { kind: 'out'; text: string; vars: string[]; line: number }
  | { kind: 'act'; action: RobotAction }
  | { kind: 'new'; cls: string; id: number; line: number };

export interface RunContext {
  input?: string[];
  sensors?: Record<string, JsVal | JsVal[]>;
  api: GameApi;
  maxSteps?: number;
}

export interface RunResult {
  outputs: string[];
  outputVars: string[][];
  actions: RobotAction[];
  events: RunEvent[];
  /** last known value of each local declared in Main */
  vars: Record<string, { type: string; value: JsVal }>;
  objects: ObjSnapshot[];
  error?: RuntimeErr;
  steps: number;
  inputReads: number;
  sensorReads: Record<string, number>;
}

/** Robot actions per run before it "overheats" — stops infinite loops of Robot.X() early */
const MAX_ACTIONS = 300;
const NULL: Val = { t: 'null' };
const VOID: Val = { t: 'void' };
const I = (v: number): Val => ({ t: 'int', v: v | 0 });
const D = (v: number): Val => ({ t: 'double', v });
const S = (v: string): Val => ({ t: 'string', v });
const B = (v: boolean): Val => ({ t: 'bool', v });

class Env {
  vars = new Map<string, { type: string; val: Val }>();
  constructor(public parent?: Env) {}
  find(n: string): { type: string; val: Val } | undefined {
    return this.vars.get(n) ?? this.parent?.find(n);
  }
}

interface Frame {
  cls: ClassInfo;
  self?: ObjVal;
  isMain: boolean;
}

type Completion = undefined | { type: 'return'; value: Val } | { type: 'break' } | { type: 'continue' };

export function defaultValue(type: string): Val {
  switch (type) {
    case 'int': return I(0);
    case 'double': return D(0);
    case 'bool': return B(false);
    case 'char': return { t: 'char', v: '\0' };
    default: return NULL;
  }
}

export function formatDouble(v: number): string {
  if (!isFinite(v)) return isNaN(v) ? 'NaN' : v > 0 ? '∞' : '-∞';
  if (Number.isInteger(v)) return String(v);
  return String(parseFloat(v.toPrecision(15)));
}

export function toJs(v: Val): JsVal {
  switch (v.t) {
    case 'int': case 'double': return v.v;
    case 'string': case 'char': return v.v;
    case 'bool': return v.v;
    default: return null;
  }
}

function snapshot(o: ObjVal): ObjSnapshot {
  return { id: o.id, cls: o.cls, fields: Object.fromEntries([...o.fields.entries()].map(([k, v]) => [k, toJs(v)])) };
}

function fromJs(x: JsVal | undefined, type: string): Val {
  if (x === null || x === undefined) return defaultValue(type);
  switch (type) {
    case 'int': return I(Number(x));
    case 'double': return D(Number(x));
    case 'bool': return B(Boolean(x));
    default: return S(String(x));
  }
}

export class Interpreter {
  private outputs: string[] = [];
  private outputVars: string[][] = [];
  private lineBuf = '';
  private lineVars = new Set<string>();
  private actions: RobotAction[] = [];
  private events: RunEvent[] = [];
  private vars: Record<string, { type: string; value: JsVal }> = {};
  private objects: ObjVal[] = [];
  private steps = 0;
  private depth = 0;
  private inputIdx = 0;
  private sensorReads: Record<string, number> = {};
  private statics = new Map<string, Map<string, Val>>();
  private trackers: Set<string>[] = [];
  private nextId = 1;
  private maxSteps: number;

  constructor(private chk: CheckResult, private ctx: RunContext) {
    this.maxSteps = ctx.maxSteps ?? 50000;
  }

  run(): RunResult {
    let error: RuntimeErr | undefined;
    try {
      // static field init
      for (const info of this.chk.classes.values()) {
        const m = new Map<string, Val>();
        this.statics.set(info.name, m);
        for (const f of info.fields.values()) if (f.isStatic) m.set(f.name, defaultValue(f.type));
      }
      for (const info of this.chk.classes.values()) {
        for (const f of info.fields.values()) {
          if (f.isStatic && f.init) {
            const env = new Env();
            this.statics.get(info.name)!.set(f.name, this.coerce(this.eval(f.init, env, { cls: info, isMain: false }), f.type));
          }
        }
      }
      const main = this.chk.classes.get(this.chk.mainClass)!;
      const m = main.methods.get('Main')!;
      const env = new Env();
      if (m.params.length) env.vars.set(m.params[0].name, { type: 'string[]', val: { t: 'arr', elem: 'string', items: [] } });
      this.execBlock(m.body.body, env, { cls: main, isMain: true });
    } catch (e) {
      if (e instanceof RuntimeErr) error = e;
      else throw e;
    }
    if (this.lineBuf) this.flushLine(0);
    return {
      outputs: this.outputs,
      outputVars: this.outputVars,
      actions: this.actions,
      events: this.events,
      vars: this.vars,
      objects: this.objects.map(snapshot),
      error,
      steps: this.steps,
      inputReads: this.inputIdx,
      sensorReads: this.sensorReads,
    };
  }

  // ---------- helpers ----------
  private tick(line: number) {
    if (++this.steps > this.maxSteps) {
      throw new RuntimeErr('TimeoutException', 'The program ran for too long (infinite loop?)', line, 'infiniteLoop');
    }
  }

  private flushLine(line: number) {
    this.outputs.push(this.lineBuf);
    this.outputVars.push([...this.lineVars]);
    this.events.push({ kind: 'out', text: this.lineBuf, vars: [...this.lineVars], line });
    this.lineBuf = '';
    this.lineVars = new Set();
  }

  str(v: Val, frame?: Frame): string {
    switch (v.t) {
      case 'int': return String(v.v);
      case 'double': return formatDouble(v.v);
      case 'string': return v.v;
      case 'char': return v.v;
      case 'bool': return v.v ? 'True' : 'False';
      case 'null': return '';
      case 'void': return '';
      case 'cls': return v.name;
      case 'arr': return `System.${{ int: 'Int32', string: 'String', double: 'Double', bool: 'Boolean' }[v.elem] ?? v.elem}[]`;
      case 'obj': {
        const m = this.findMethod(v.cls, 'ToString');
        if (m && frame) {
          const r = this.invoke(m.m, this.chk.classes.get(m.owner)!, v, [], m.m.line);
          return this.str(r);
        }
        return v.cls;
      }
    }
  }

  private num(v: Val): number {
    if (v.t === 'int' || v.t === 'double') return v.v;
    if (v.t === 'char') return v.v.charCodeAt(0);
    return 0;
  }

  coerce(v: Val, type: string): Val {
    if (type === 'double' && (v.t === 'int' || v.t === 'char')) return D(this.num(v));
    if (type === 'int' && v.t === 'char') return I(this.num(v));
    return v;
  }

  private findMethod(cls: string, name: string): { m: MethodDecl; owner: string } | undefined {
    let cur: string | undefined = cls;
    while (cur) {
      const info = this.chk.classes.get(cur);
      if (!info) return undefined;
      const m = info.methods.get(name);
      if (m) return { m, owner: cur };
      cur = info.base;
    }
    return undefined;
  }

  private findStaticOwner(cls: string, name: string): Map<string, Val> | undefined {
    let cur: string | undefined = cls;
    while (cur) {
      const m = this.statics.get(cur);
      if (m?.has(name)) return m;
      cur = this.chk.classes.get(cur)?.base;
    }
    return undefined;
  }

  private logVar(frame: Frame, env: Env, name: string, type: string, val: Val) {
    if (frame.isMain && env) this.vars[name] = { type, value: toJs(val) };
  }

  // ---------- statements ----------
  private execBlock(body: Stmt[], env: Env, frame: Frame): Completion {
    for (const s of body) {
      const c = this.exec(s, env, frame);
      if (c) return c;
    }
    return undefined;
  }

  private exec(s: Stmt, env: Env, frame: Frame): Completion {
    this.tick(s.line);
    switch (s.k) {
      case 'block':
        return this.execBlock(s.body, new Env(env), frame);
      case 'empty':
        return;
      case 'decl':
        for (const d of s.decls) {
          let val: Val;
          let type = s.type;
          if (d.init) {
            if (d.init.k === 'arrInit') {
              const elem = type.slice(0, -2);
              val = { t: 'arr', elem, items: d.init.items.map((it) => this.coerce(this.eval(it, env, frame), elem)) };
            } else {
              val = this.eval(d.init, env, frame);
              if (type === 'var') type = val.t === 'obj' ? val.cls : val.t === 'arr' ? val.elem + '[]' : val.t;
              val = this.coerce(val, type);
            }
          } else val = defaultValue(type);
          env.vars.set(d.name, { type, val });
          this.logVar(frame, env, d.name, type, val);
        }
        return;
      case 'expr':
        this.eval(s.expr, env, frame);
        return;
      case 'if':
        if (this.truthy(this.eval(s.test, env, frame))) return this.exec(s.then, new Env(env), frame);
        if (s.else) return this.exec(s.else, new Env(env), frame);
        return;
      case 'while':
        while (this.truthy(this.eval(s.test, env, frame))) {
          this.tick(s.line);
          const c = this.exec(s.body, new Env(env), frame);
          if (c?.type === 'break') break;
          if (c?.type === 'return') return c;
        }
        return;
      case 'doWhile':
        do {
          this.tick(s.line);
          const c = this.exec(s.body, new Env(env), frame);
          if (c?.type === 'break') break;
          if (c?.type === 'return') return c;
        } while (this.truthy(this.eval(s.test, env, frame)));
        return;
      case 'for': {
        const inner = new Env(env);
        if (s.init) this.exec(s.init, inner, frame);
        while (!s.test || this.truthy(this.eval(s.test, inner, frame))) {
          this.tick(s.line);
          const c = this.exec(s.body, new Env(inner), frame);
          if (c?.type === 'break') break;
          if (c?.type === 'return') return c;
          for (const u of s.update) this.eval(u, inner, frame);
        }
        return;
      }
      case 'foreach': {
        const it = this.eval(s.iter, env, frame);
        if (it.t === 'null') throw new RuntimeErr('NullReferenceException', 'Object reference not set to an instance of an object.', s.line, 'nullRef');
        const items: Val[] = it.t === 'arr' ? [...it.items] : it.t === 'string' ? [...it.v].map((ch) => ({ t: 'char', v: ch }) as Val) : [];
        for (const item of items) {
          this.tick(s.line);
          const inner = new Env(env);
          inner.vars.set(s.name, { type: s.type, val: item });
          const c = this.exec(s.body, inner, frame);
          if (c?.type === 'break') break;
          if (c?.type === 'return') return c;
        }
        return;
      }
      case 'return':
        return { type: 'return', value: s.value ? this.eval(s.value, env, frame) : VOID };
      case 'break':
        return { type: 'break' };
      case 'continue':
        return { type: 'continue' };
    }
  }

  private truthy(v: Val): boolean {
    return v.t === 'bool' && v.v;
  }

  // ---------- expressions ----------
  eval(e: Expr, env: Env, frame: Frame): Val {
    switch (e.k) {
      case 'lit':
        switch (e.type) {
          case 'int': return I(e.value as number);
          case 'double': return D(e.value as number);
          case 'string': return S(e.value as string);
          case 'bool': return B(e.value as boolean);
          case 'char': return { t: 'char', v: e.value as string };
          default: return NULL;
        }
      case 'interp':
        return S(e.parts.map((p) => (typeof p === 'string' ? p : this.str(this.eval(p, env, frame), frame))).join(''));
      case 'this':
        return frame.self ?? NULL;
      case 'base':
        return frame.self ?? NULL;
      case 'name':
        return this.readName(e.name, env, frame);
      case 'member':
        return this.readMember(e, env, frame);
      case 'call':
        return this.call(e, env, frame);
      case 'index': {
        const o = this.eval(e.obj, env, frame);
        const i = this.num(this.eval(e.index, env, frame));
        if (o.t === 'null') throw new RuntimeErr('NullReferenceException', 'Object reference not set to an instance of an object.', e.line, 'nullRef');
        if (o.t === 'arr') {
          if (i < 0 || i >= o.items.length) throw new RuntimeErr('IndexOutOfRangeException', 'Index was outside the bounds of the array.', e.line, 'indexOutOfRange', { index: String(i), length: String(o.items.length) });
          return o.items[i];
        }
        if (o.t === 'string') {
          if (i < 0 || i >= o.v.length) throw new RuntimeErr('IndexOutOfRangeException', 'Index was outside the bounds of the array.', e.line, 'indexOutOfRange', { index: String(i), length: String(o.v.length) });
          return { t: 'char', v: o.v[i] };
        }
        return NULL;
      }
      case 'new':
        return this.construct(e.type, e.args.map((a) => this.eval(a, env, frame)), e.line);
      case 'newArr': {
        if (e.init) return { t: 'arr', elem: e.elem, items: e.init.map((it) => this.coerce(this.eval(it, env, frame), e.elem)) };
        const n = this.num(this.eval(e.size!, env, frame));
        if (n < 0) throw new RuntimeErr('OverflowException', 'Arithmetic operation resulted in an overflow.', e.line, 'indexOutOfRange', { index: String(n), length: '0' });
        if (n > 100000) throw new RuntimeErr('OutOfMemoryException', 'Array too large for this terminal.', e.line, 'infiniteLoop');
        return { t: 'arr', elem: e.elem, items: Array.from({ length: n }, () => defaultValue(e.elem)) };
      }
      case 'arrInit':
        return { t: 'arr', elem: '?', items: e.items.map((it) => this.eval(it, env, frame)) };
      case 'unary': {
        const v = this.eval(e.arg, env, frame);
        if (e.op === '!') return B(!this.truthy(v));
        if (e.op === '-') return v.t === 'double' ? D(-v.v) : I(-this.num(v));
        return v.t === 'char' ? I(this.num(v)) : v;
      }
      case 'incdec': {
        const old = this.eval(e.arg, env, frame);
        const delta = e.op === '++' ? 1 : -1;
        const nv: Val = old.t === 'double' ? D(old.v + delta) : old.t === 'char' ? { t: 'char', v: String.fromCharCode(this.num(old) + delta) } : I(this.num(old) + delta);
        this.write(e.arg, nv, env, frame);
        return e.prefix ? nv : old;
      }
      case 'bin':
        return this.bin(e, env, frame);
      case 'assign': {
        let v = this.eval(e.value, env, frame);
        if (e.op !== '=') {
          const cur = this.eval(e.target, env, frame);
          v = this.arith(e.op[0], cur, v, e.line, frame);
        }
        this.write(e.target, v, env, frame);
        return v;
      }
      case 'cond':
        return this.truthy(this.eval(e.test, env, frame)) ? this.eval(e.a, env, frame) : this.eval(e.b, env, frame);
      case 'cast': {
        const v = this.eval(e.arg, env, frame);
        switch (e.type) {
          case 'int': return I(Math.trunc(this.num(v)));
          case 'double': return D(this.num(v));
          case 'char': return { t: 'char', v: String.fromCharCode(this.num(v)) };
          default: return v;
        }
      }
    }
  }

  private readName(name: string, env: Env, frame: Frame): Val {
    const local = env.find(name);
    if (local) {
      this.trackers[this.trackers.length - 1]?.add(name);
      return local.val;
    }
    if (frame.self) {
      if (frame.self.fields.has(name)) {
        this.trackers[this.trackers.length - 1]?.add(name);
        return frame.self.fields.get(name)!;
      }
    }
    const st = this.findStaticOwner(frame.cls.name, name);
    if (st) {
      this.trackers[this.trackers.length - 1]?.add(name);
      return st.get(name)!;
    }
    return { t: 'cls', name };
  }

  private readMember(e: Extract<Expr, { k: 'member' }>, env: Env, frame: Frame): Val {
    const o = this.eval(e.obj, env, frame);
    if (o.t === 'cls') {
      if (o.name === 'int') return I(e.name === 'MaxValue' ? 2147483647 : -2147483648);
      if (o.name === 'Math' && e.name === 'PI') return D(Math.PI);
      const st = this.findStaticOwner(o.name, e.name);
      if (st) {
        this.trackers[this.trackers.length - 1]?.add(e.name);
        return st.get(e.name)!;
      }
      return NULL;
    }
    if (o.t === 'null') throw new RuntimeErr('NullReferenceException', 'Object reference not set to an instance of an object.', e.line, 'nullRef');
    if (o.t === 'string' && e.name === 'Length') return I(o.v.length);
    if (o.t === 'arr' && e.name === 'Length') return I(o.items.length);
    if (o.t === 'obj') {
      this.trackers[this.trackers.length - 1]?.add(e.name);
      return o.fields.get(e.name) ?? NULL;
    }
    return NULL;
  }

  private write(target: Expr, v: Val, env: Env, frame: Frame) {
    if (target.k === 'name') {
      const local = env.find(target.name);
      if (local) {
        local.val = this.coerce(v, local.type);
        this.logVar(frame, env, target.name, local.type, local.val);
        return;
      }
      if (frame.self?.fields.has(target.name)) {
        frame.self.fields.set(target.name, this.coerce(v, this.fieldType(frame.self.cls, target.name)));
        return;
      }
      const st = this.findStaticOwner(frame.cls.name, target.name);
      if (st) st.set(target.name, this.coerce(v, this.fieldType(frame.cls.name, target.name)));
      return;
    }
    if (target.k === 'member') {
      const o = this.eval(target.obj, env, frame);
      if (o.t === 'null') throw new RuntimeErr('NullReferenceException', 'Object reference not set to an instance of an object.', target.line, 'nullRef');
      if (o.t === 'obj') o.fields.set(target.name, this.coerce(v, this.fieldType(o.cls, target.name)));
      else if (o.t === 'cls') this.findStaticOwner(o.name, target.name)?.set(target.name, this.coerce(v, this.fieldType(o.name, target.name)));
      return;
    }
    if (target.k === 'index') {
      const o = this.eval(target.obj, env, frame);
      const i = this.num(this.eval(target.index, env, frame));
      if (o.t === 'null') throw new RuntimeErr('NullReferenceException', 'Object reference not set to an instance of an object.', target.line, 'nullRef');
      if (o.t === 'arr') {
        if (i < 0 || i >= o.items.length) throw new RuntimeErr('IndexOutOfRangeException', 'Index was outside the bounds of the array.', target.line, 'indexOutOfRange', { index: String(i), length: String(o.items.length) });
        o.items[i] = this.coerce(v, o.elem);
      }
    }
  }

  private fieldType(cls: string, name: string): string {
    let cur: string | undefined = cls;
    while (cur) {
      const info = this.chk.classes.get(cur);
      const f = info?.fields.get(name);
      if (f) return f.type;
      cur = info?.base;
    }
    return '?';
  }

  private arith(op: string, l: Val, r: Val, line: number, frame: Frame): Val {
    if (op === '+' && (l.t === 'string' || r.t === 'string')) return S(this.str(l, frame) + this.str(r, frame));
    const isD = l.t === 'double' || r.t === 'double';
    const a = this.num(l), b = this.num(r);
    switch (op) {
      case '+': return isD ? D(a + b) : I(a + b);
      case '-': return isD ? D(a - b) : I(a - b);
      case '*': return isD ? D(a * b) : I(Math.imul(a, b));
      case '/':
        if (!isD && b === 0) throw new RuntimeErr('DivideByZeroException', 'Attempted to divide by zero.', line, 'divideByZero');
        return isD ? D(a / b) : I(Math.trunc(a / b));
      case '%':
        if (!isD && b === 0) throw new RuntimeErr('DivideByZeroException', 'Attempted to divide by zero.', line, 'divideByZero');
        return isD ? D(a % b) : I(a % b);
    }
    return NULL;
  }

  private equals(l: Val, r: Val): boolean {
    if (l.t === 'null' || r.t === 'null') return l.t === r.t;
    if ((l.t === 'int' || l.t === 'double' || l.t === 'char') && (r.t === 'int' || r.t === 'double' || r.t === 'char')) return this.num(l) === this.num(r);
    if (l.t === 'string' && r.t === 'string') return l.v === r.v;
    if (l.t === 'bool' && r.t === 'bool') return l.v === r.v;
    return l === r;
  }

  private bin(e: Extract<Expr, { k: 'bin' }>, env: Env, frame: Frame): Val {
    if (e.op === '&&') return B(this.truthy(this.eval(e.l, env, frame)) && this.truthy(this.eval(e.r, env, frame)));
    if (e.op === '||') return B(this.truthy(this.eval(e.l, env, frame)) || this.truthy(this.eval(e.r, env, frame)));
    const l = this.eval(e.l, env, frame);
    const r = this.eval(e.r, env, frame);
    switch (e.op) {
      case '==': return B(this.equals(l, r));
      case '!=': return B(!this.equals(l, r));
      case '<': return B(this.num(l) < this.num(r));
      case '>': return B(this.num(l) > this.num(r));
      case '<=': return B(this.num(l) <= this.num(r));
      case '>=': return B(this.num(l) >= this.num(r));
      default: return this.arith(e.op, l, r, e.line, frame);
    }
  }

  // ---------- calls ----------
  private call(e: Extract<Expr, { k: 'call' }>, env: Env, frame: Frame): Val {
    const c = e.callee;
    if (c.k === 'name') {
      const m = this.findMethod(frame.cls.name, c.name)!;
      const args = e.args.map((a) => this.eval(a, env, frame));
      const target = m.m.isStatic ? undefined : frame.self;
      // virtual dispatch on implicit this
      if (target && (m.m.isVirtual || m.m.isOverride)) {
        const real = this.findMethod(target.cls, c.name)!;
        return this.invoke(real.m, this.chk.classes.get(real.owner)!, target, args, e.line);
      }
      return this.invoke(m.m, this.chk.classes.get(m.owner)!, target, args, e.line);
    }
    if (c.k !== 'member') return NULL;
    const name = c.name;

    // base.Method()
    if (c.obj.k === 'base') {
      const baseName = frame.cls.base!;
      const m = this.findMethod(baseName, name);
      const args = e.args.map((a) => this.eval(a, env, frame));
      if (m) return this.invoke(m.m, this.chk.classes.get(m.owner)!, frame.self, args, e.line);
      return NULL;
    }

    // Console.WriteLine tracks which variables were used in the printed line
    const isConsole = c.obj.k === 'name' && c.obj.name === 'Console' && !env.find('Console');
    if (isConsole && (name === 'WriteLine' || name === 'Write')) {
      this.trackers.push(new Set());
      const args = e.args.map((a) => this.eval(a, env, frame));
      const used = this.trackers.pop()!;
      let text = '';
      if (args.length > 1 && args[0].t === 'string') {
        text = args[0].v.replace(/\{(\d+)(?::[^}]*)?\}/g, (_, i) => this.str(args[Number(i) + 1] ?? NULL, frame));
      } else if (args.length) text = this.str(args[0], frame);
      used.forEach((u) => this.lineVars.add(u));
      this.lineBuf += text;
      if (name === 'WriteLine') this.flushLine(e.line);
      return VOID;
    }

    const o = this.eval(c.obj, env, frame);
    const args = e.args.map((a) => this.eval(a, env, frame));
    if (o.t === 'cls') return this.staticCall(o.name, name, args, e.line, frame);
    if (o.t === 'null') throw new RuntimeErr('NullReferenceException', 'Object reference not set to an instance of an object.', e.line, 'nullRef');
    if (name === 'ToString' && o.t !== 'obj') return S(this.str(o, frame));
    if (o.t === 'string') return this.stringCall(o.v, name, args, frame);
    if (o.t === 'obj') {
      const m = this.findMethod(o.cls, name);
      if (!m) return name === 'ToString' ? S(o.cls) : NULL;
      return this.invoke(m.m, this.chk.classes.get(m.owner)!, o, args, e.line);
    }
    return NULL;
  }

  private stringCall(s: string, name: string, args: Val[], frame: Frame): Val {
    const a0 = args[0] ? this.str(args[0], frame) : '';
    switch (name) {
      case 'ToUpper': return S(s.toUpperCase());
      case 'ToLower': return S(s.toLowerCase());
      case 'Trim': return S(s.trim());
      case 'Contains': return B(s.includes(a0));
      case 'StartsWith': return B(s.startsWith(a0));
      case 'EndsWith': return B(s.endsWith(a0));
      case 'IndexOf': return I(s.indexOf(a0));
      case 'Substring': {
        const st = this.num(args[0]);
        const len = args[1] ? this.num(args[1]) : s.length - st;
        if (st < 0 || st + len > s.length || len < 0) throw new RuntimeErr('ArgumentOutOfRangeException', 'Index and length must refer to a location within the string.', 0, 'indexOutOfRange', { index: String(st), length: String(s.length) });
        return S(s.substr(st, len));
      }
      case 'Replace': return S(s.split(a0).join(args[1] ? this.str(args[1], frame) : ''));
      case 'Equals': return B(args[0]?.t === 'string' && args[0].v === s);
    }
    return NULL;
  }

  private parseIntStrict(s: Val, line: number, as: 'int' | 'double'): Val {
    if (s.t === 'null') throw new RuntimeErr('ArgumentNullException', "Value cannot be null. (Parameter 's')", line, 'formatException', { value: 'null' });
    const raw = s.t === 'string' ? s.v : this.str(s);
    const re = as === 'int' ? /^\s*[+-]?\d+\s*$/ : /^\s*[+-]?(\d+\.?\d*|\.\d+)\s*$/;
    if (!re.test(raw)) {
      throw new RuntimeErr('FormatException', `The input string '${raw}' was not in a correct format.`, line, 'formatException', { value: raw });
    }
    return as === 'int' ? I(parseInt(raw, 10)) : D(parseFloat(raw));
  }

  private staticCall(cls: string, name: string, args: Val[], line: number, frame: Frame): Val {
    const api = this.ctx.api;
    if (cls === 'Robot' && api.Robot && !this.chk.classes.has('Robot')) {
      if (this.actions.length >= MAX_ACTIONS) {
        throw new RuntimeErr('RobotOverheatException', `Robot R-7 overheated after ${MAX_ACTIONS} actions (infinite loop?)`, line, 'infiniteLoop');
      }
      const action: RobotAction = { name, args: args.map(toJs), line, objs: args.map((a) => (a.t === 'obj' ? snapshot(a) : null)) };
      this.actions.push(action);
      this.events.push({ kind: 'act', action });
      return VOID;
    }
    if (cls === 'Sensor' && api.Sensor && !this.chk.classes.has('Sensor')) {
      this.sensorReads[name] = (this.sensorReads[name] ?? 0) + 1;
      const val = this.ctx.sensors?.[name];
      // an array is a queue: each call returns the next value, then sticks on the last one
      return fromJs(Array.isArray(val) ? val[Math.min(this.sensorReads[name] - 1, val.length - 1)] : val, api.Sensor[name] ?? 'string');
    }
    switch (`${cls}.${name}`) {
      case 'Console.ReadLine': {
        const inp = this.ctx.input ?? [];
        const v = this.inputIdx < inp.length ? S(inp[this.inputIdx]) : NULL;
        this.inputIdx++;
        return v;
      }
      case 'Console.Clear': return VOID;
      case 'int.Parse': return this.parseIntStrict(args[0], line, 'int');
      case 'double.Parse': return this.parseIntStrict(args[0], line, 'double');
      case 'Convert.ToInt32':
        if (args[0].t === 'string') return this.parseIntStrict(args[0], line, 'int');
        if (args[0].t === 'double') return I(roundHalfEven(args[0].v));
        if (args[0].t === 'bool') return I(args[0].v ? 1 : 0);
        return I(this.num(args[0]));
      case 'Convert.ToDouble':
        if (args[0].t === 'string') return this.parseIntStrict(args[0], line, 'double');
        return D(this.num(args[0]));
      case 'Convert.ToString': return S(this.str(args[0], frame));
      case 'string.IsNullOrEmpty': return B(args[0].t === 'null' || (args[0].t === 'string' && args[0].v === ''));
    }
    if (cls === 'Math') {
      const nums = args.map((a) => this.num(a));
      const anyD = args.some((a) => a.t === 'double');
      const numRet = (x: number) => (anyD ? D(x) : I(x));
      switch (name) {
        case 'Max': return numRet(Math.max(nums[0], nums[1]));
        case 'Min': return numRet(Math.min(nums[0], nums[1]));
        case 'Abs': return numRet(Math.abs(nums[0]));
        case 'Pow': return D(Math.pow(nums[0], nums[1]));
        case 'Sqrt': return D(Math.sqrt(nums[0]));
        case 'Round': {
          const p = Math.pow(10, nums[1] ?? 0);
          return D(roundHalfEven(nums[0] * p) / p);
        }
        case 'Floor': return D(Math.floor(nums[0]));
        case 'Ceiling': return D(Math.ceil(nums[0]));
      }
    }
    // user static method
    const m = this.findMethod(cls, name);
    if (m) return this.invoke(m.m, this.chk.classes.get(m.owner)!, undefined, args, line);
    return NULL;
  }

  invoke(m: MethodDecl, cls: ClassInfo, self: ObjVal | undefined, args: Val[], line: number): Val {
    if (++this.depth > 200) {
      this.depth = 0;
      throw new RuntimeErr('StackOverflowException', 'Stack overflow (a method keeps calling itself).', line, 'infiniteLoop');
    }
    const env = new Env();
    m.params.forEach((p, i) => env.vars.set(p.name, { type: p.type, val: this.coerce(args[i] ?? defaultValue(p.type), p.type) }));
    const c = this.execBlock(m.body.body, env, { cls, self, isMain: false });
    this.depth--;
    if (c?.type === 'return') return this.coerce(c.value, m.ret);
    return VOID;
  }

  construct(clsName: string, args: Val[], line: number): Val {
    const obj: ObjVal = { t: 'obj', cls: clsName, id: this.nextId++, fields: new Map() };
    this.objects.push(obj);
    this.events.push({ kind: 'new', cls: clsName, id: obj.id, line });
    // chain from root base to derived
    const chain: ClassInfo[] = [];
    let cur: string | undefined = clsName;
    while (cur) {
      const info: ClassInfo = this.chk.classes.get(cur)!;
      chain.unshift(info);
      cur = info.base;
    }
    for (const info of chain) {
      for (const f of info.fields.values()) {
        if (f.isStatic) continue;
        obj.fields.set(f.name, defaultValue(f.type));
      }
    }
    for (const info of chain) {
      for (const f of info.fields.values()) {
        if (f.isStatic || !f.init) continue;
        obj.fields.set(f.name, this.coerce(this.eval(f.init, new Env(), { cls: info, self: obj, isMain: false }), f.type));
      }
    }
    this.runCtor(chain[chain.length - 1], obj, args, line);
    return obj;
  }

  private runCtor(info: ClassInfo, obj: ObjVal, args: Val[], line: number) {
    this.tick(line);
    const ctor = info.decl.ctors.find((c) => c.params.length === args.length);
    const env = new Env();
    ctor?.params.forEach((p, i) => env.vars.set(p.name, { type: p.type, val: this.coerce(args[i], p.type) }));
    const frame: Frame = { cls: info, self: obj, isMain: false };
    if (info.base) {
      const baseInfo = this.chk.classes.get(info.base)!;
      const baseArgs = ctor?.baseArgs ? ctor.baseArgs.map((a) => this.eval(a, env, frame)) : [];
      this.runCtor(baseInfo, obj, baseArgs, line);
    }
    if (ctor) this.execBlock(ctor.body.body, env, frame);
  }
}

function roundHalfEven(x: number): number {
  const r = Math.round(x);
  if (Math.abs(x % 1) === 0.5) return 2 * Math.round(x / 2);
  return r;
}
