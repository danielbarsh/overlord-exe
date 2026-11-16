/**
 * Static semantic pass — the part that makes this feel like a real C# compiler:
 * unknown names, wrong casing, type mismatches, `=` vs `==`, private access, etc.
 * Throws the FIRST error (kid-friendly), collects warnings.
 */
import type { ClassDecl, Expr, FieldDecl, MethodDecl, Program, Stmt } from './ast';
import {
  apiClasses, NUMERIC, normalizeType, PRIMITIVES, STATIC_CLASSES, STRING_MEMBERS,
  type BuiltinClass, type BuiltinMethod, type GameApi,
} from './builtins';
import { cerr, type Diagnostic } from './errors';

export interface ClassInfo {
  decl: ClassDecl;
  name: string;
  base?: string;
  fields: Map<string, FieldDecl>;
  methods: Map<string, MethodDecl>;
}

export interface CodeStats {
  loops: number;
  ifs: number;
  elses: number;
  classes: number;
  news: number;
  /** call sites by name, e.g. { 'Robot.Dash': 3, 'Console.WriteLine': 2 } */
  calls: Record<string, number>;
  /** declared locals in Main: name -> type */
  mainLocals: Record<string, string>;
  usesAnd: number;
  usesOr: number;
  /** shape of every user class — for validators of the OOP stages */
  classInfo: Record<string, ClassShape>;
}

export interface ClassShape {
  base?: string;
  fields: Record<string, { type: string; access: string; isStatic: boolean; isProp: boolean }>;
  /** parameter type lists, one per constructor */
  ctors: string[][];
  methods: Record<string, { ret: string; access: string; params: string[]; isStatic: boolean; isVirtual: boolean; isOverride: boolean }>;
}

export interface CheckResult {
  classes: Map<string, ClassInfo>;
  mainClass: string;
  warnings: Diagnostic[];
  stats: CodeStats;
}

interface VarInfo {
  type: string;
  assigned: boolean;
  line: number;
}

class Scope {
  vars = new Map<string, VarInfo>();
  constructor(public parent?: Scope) {}
  find(n: string): VarInfo | undefined {
    return this.vars.get(n) ?? this.parent?.find(n);
  }
  all(): string[] {
    return [...this.vars.keys(), ...(this.parent?.all() ?? [])];
  }
}

type Resolved =
  | { kind: 'field'; type: string; access: string; owner: string; isStatic: boolean; setAccess?: string; isProp?: boolean }
  | { kind: 'method'; ret: string; owner: string; access: string; user?: MethodDecl; builtin?: BuiltinMethod; isStatic: boolean };

export function check(prog: Program, api: GameApi): CheckResult {
  return new Checker(prog, api).run();
}

class Checker {
  classes = new Map<string, ClassInfo>();
  statics: Record<string, BuiltinClass>;
  warnings: Diagnostic[] = [];
  stats: CodeStats = { loops: 0, ifs: 0, elses: 0, classes: 0, news: 0, calls: {}, mainLocals: {}, usesAnd: 0, usesOr: 0, classInfo: {} };

  // current context
  cls!: ClassInfo;
  method!: MethodDecl;
  inMain = false;
  loopDepth = 0;
  sawReturn = false;

  constructor(private prog: Program, api: GameApi) {
    this.statics = { ...STATIC_CLASSES, ...apiClasses(api) };
  }

  run(): CheckResult {
    // register classes
    for (const c of this.prog.classes) {
      if (this.classes.has(c.name) || this.statics[c.name]) {
        throw cerr('CS0101', `The namespace already contains a definition for '${c.name}'`, c.line, 1, 'duplicateVar', { name: c.name });
      }
      const info: ClassInfo = { decl: c, name: c.name, base: c.base, fields: new Map(), methods: new Map() };
      for (const f of c.fields) {
        f.type = normalizeType(f.type);
        if (info.fields.has(f.name)) throw cerr('CS0102', `The type '${c.name}' already contains a definition for '${f.name}'`, f.line, 1, 'duplicateVar', { name: f.name });
        info.fields.set(f.name, f);
      }
      for (const m of c.methods) {
        m.ret = normalizeType(m.ret);
        m.params.forEach((p) => (p.type = normalizeType(p.type)));
        info.methods.set(m.name, m);
      }
      c.ctors.forEach((m) => m.params.forEach((p) => (p.type = normalizeType(p.type))));
      this.classes.set(c.name, info);
    }
    this.stats.classes = this.classes.size;
    for (const info of this.classes.values()) {
      const d = info.decl;
      this.stats.classInfo[info.name] = {
        base: info.base,
        fields: Object.fromEntries(d.fields.map((f) => [f.name, { type: f.type, access: f.access, isStatic: f.isStatic, isProp: !!f.isProp }])),
        ctors: d.ctors.map((c) => c.params.map((p) => p.type)),
        methods: Object.fromEntries(d.methods.map((m) => [m.name, { ret: m.ret, access: m.access, params: m.params.map((p) => p.type), isStatic: m.isStatic, isVirtual: m.isVirtual, isOverride: m.isOverride }])),
      };
    }
    // validate bases & types
    for (const info of this.classes.values()) {
      if (info.base) {
        if (!this.classes.has(info.base)) {
          const sug = this.suggestClass(info.base);
          throw cerr('CS0246', `The type or namespace name '${info.base}' could not be found`, info.decl.line, 1, sug ? 'casing' : 'unknownName', { name: info.base, suggest: sug ?? '' });
        }
        // cycle check
        const seen = new Set<string>();
        let cur: string | undefined = info.name;
        while (cur) {
          if (seen.has(cur)) throw cerr('CS0146', `Circular base type dependency involving '${info.name}'`, info.decl.line, 1, 'syntax');
          seen.add(cur);
          cur = this.classes.get(cur)?.base;
        }
      }
      // C#: a subclass must chain to a base constructor the base actually has (CS7036)
      if (info.base) {
        const baseDecl = this.classes.get(info.base)!.decl;
        const baseNeedsArgs = baseDecl.ctors.length > 0 && !baseDecl.ctors.some((c) => c.params.length === 0);
        if (baseNeedsArgs) {
          const msg = `There is no argument given that corresponds to the required parameters of '${info.base}' constructor`;
          if (info.decl.ctors.length === 0) throw cerr('CS7036', msg, info.decl.line, 1, 'needsBaseCtor', { name: info.name, base: info.base });
          for (const c of info.decl.ctors) if (!c.baseArgs) throw cerr('CS7036', msg, c.line, 1, 'needsBaseCtor', { name: info.name, base: info.base });
        }
      }
      for (const f of info.fields.values()) this.checkTypeName(f.type, f.line);
      for (const m of info.methods.values()) {
        if (m.ret !== 'void') this.checkTypeName(m.ret, m.line);
        m.params.forEach((p) => this.checkTypeName(p.type, m.line));
        const baseM = info.base ? this.findMethod(info.base, m.name) : undefined;
        if (m.isOverride) {
          if (!baseM) throw cerr('CS0115', `'${info.name}.${m.name}()': no suitable method found to override`, m.line, 1, 'unknownMember', { name: m.name });
          if (!baseM.m.isVirtual && !baseM.m.isOverride)
            throw cerr('CS0506', `'${info.name}.${m.name}()': cannot override inherited member '${baseM.owner}.${m.name}()' because it is not marked virtual or override`, m.line, 1, 'notVirtual', { name: m.name, owner: baseM.owner });
        } else if (baseM && !m.isStatic && (baseM.m.isVirtual || baseM.m.isOverride)) {
          this.warnings.push({ code: 'CS0114', message: `'${info.name}.${m.name}()' hides inherited member '${baseM.owner}.${m.name}()'. To make the current member override that implementation, add the override keyword.`, line: m.line, col: 1, roast: 'hidesMethod', extra: { name: m.name, owner: baseM.owner } });
        }
      }
    }
    // find Main
    let mainClass = '';
    for (const info of this.classes.values()) {
      const m = info.methods.get('Main');
      if (m) {
        if (!m.isStatic) throw cerr('CS5001', "Program does not contain a static 'Main' method suitable for an entry point", m.line, 1, 'missingMain', { notStatic: '1' });
        mainClass = info.name;
      }
    }
    if (!mainClass) {
      throw cerr('CS5001', "Program does not contain a static 'Main' method suitable for an entry point", 1, 1, 'missingMain');
    }
    // check bodies
    for (const info of this.classes.values()) {
      this.cls = info;
      for (const f of info.fields.values()) {
        if (f.init) {
          this.method = { name: '<init>', ret: 'void', params: [], body: { k: 'block', body: [], line: f.line }, access: 'private', isStatic: f.isStatic, isVirtual: false, isOverride: false, line: f.line };
          const t = this.typeOf(f.init, new Scope(), f.type);
          this.requireAssignable(f.type, t, f.init, f.line);
        }
      }
      for (const m of info.decl.ctors) this.checkMethod(m, true);
      for (const m of info.methods.values()) this.checkMethod(m, false);
    }
    return { classes: this.classes, mainClass, warnings: this.warnings, stats: this.stats };
  }

  // ---------- helpers ----------
  isClass(t: string) {
    return this.classes.has(t);
  }
  checkTypeName(t: string, line: number) {
    const base = t.replace(/\[\]$/g, '').replace(/\[\]$/g, '');
    if (PRIMITIVES.has(base) || this.classes.has(base) || base === 'var') return;
    const sug = this.suggestClass(base) ?? (['string', 'int', 'bool', 'double', 'char'].find((p) => p === base.toLowerCase()));
    throw cerr('CS0246', `The type or namespace name '${base}' could not be found (are you missing a using directive or an assembly reference?)`, line, 1, sug ? 'casing' : 'unknownName', { name: base, suggest: sug ?? '' });
  }
  suggestClass(n: string): string | undefined {
    const l = n.toLowerCase();
    for (const c of [...this.classes.keys(), ...Object.keys(this.statics)]) if (c.toLowerCase() === l) return c;
    return undefined;
  }
  findField(cls: string, name: string): { f: FieldDecl; owner: string } | undefined {
    let cur: string | undefined = cls;
    while (cur) {
      const info = this.classes.get(cur);
      if (!info) return undefined;
      const f = info.fields.get(name);
      if (f) return { f, owner: cur };
      cur = info.base;
    }
    return undefined;
  }
  findMethod(cls: string, name: string): { m: MethodDecl; owner: string } | undefined {
    let cur: string | undefined = cls;
    while (cur) {
      const info = this.classes.get(cur);
      if (!info) return undefined;
      const m = info.methods.get(name);
      if (m) return { m, owner: cur };
      cur = info.base;
    }
    return undefined;
  }
  isSubclass(child: string, parent: string): boolean {
    let cur: string | undefined = child;
    while (cur) {
      if (cur === parent) return true;
      cur = this.classes.get(cur)?.base;
    }
    return false;
  }
  canAccess(access: string, owner: string): boolean {
    if (access === 'public') return true;
    if (access === 'private') return this.cls.name === owner;
    return this.isSubclass(this.cls.name, owner); // protected
  }

  assignable(to: string, from: string): boolean {
    if (to === '?' || from === '?' || to === from || to === 'object') return true;
    if (to === 'double' && (from === 'int' || from === 'char')) return true;
    if (to === 'int' && from === 'char') return true;
    if (from === 'null') return !['int', 'double', 'bool', 'char'].includes(to);
    if (to.endsWith('[]') && from.endsWith('[]')) return this.assignable(to.slice(0, -2), from.slice(0, -2));
    if (this.isClass(to) && this.isClass(from)) return this.isSubclass(from, to);
    return false;
  }

  requireAssignable(to: string, from: string, valueExpr: Expr, line: number) {
    if (this.assignable(to, from)) return;
    if (from === 'void') {
      throw cerr('CS0029', `Cannot implicitly convert type 'void' to '${to}'`, line, valueExpr.col, 'typeMismatch', { from: 'void', to });
    }
    const isReadLine =
      valueExpr.k === 'call' && valueExpr.callee.k === 'member' && valueExpr.callee.name === 'ReadLine';
    if (from === 'string' && (to === 'int' || to === 'double') && isReadLine) {
      throw cerr('CS0029', `Cannot implicitly convert type 'string' to '${to}'`, line, valueExpr.col, 'readLineToInt', { to });
    }
    if (from === 'double' && to === 'int') {
      throw cerr('CS0266', "Cannot implicitly convert type 'double' to 'int'. An explicit conversion exists (are you missing a cast?)", line, valueExpr.col, 'doubleToInt');
    }
    throw cerr('CS0029', `Cannot implicitly convert type '${from}' to '${to}'`, line, valueExpr.col, 'typeMismatch', { from, to });
  }

  checkCondition(e: Expr, scope: Scope) {
    if (e.k === 'assign' && e.op === '=') {
      const vt = this.typeOf(e.value, scope);
      if (vt !== 'bool') {
        throw cerr('CS0029', `Cannot implicitly convert type '${vt}' to 'bool'`, e.line, e.col, 'assignInCondition', { name: e.target.k === 'name' ? e.target.name : 'x' });
      }
    }
    const t = this.typeOf(e, scope);
    if (t !== 'bool' && t !== '?') {
      throw cerr('CS0029', `Cannot implicitly convert type '${t}' to 'bool'`, e.line, e.col, 'conditionNotBool', { from: t });
    }
  }

  // ---------- methods & statements ----------
  checkMethod(m: MethodDecl, isCtor: boolean) {
    this.method = m;
    this.inMain = m.name === 'Main' && m.isStatic;
    this.sawReturn = false;
    this.loopDepth = 0;
    const scope = new Scope();
    for (const p of m.params) scope.vars.set(p.name, { type: p.type, assigned: true, line: m.line });
    if (isCtor && m.baseArgs) {
      const base = this.cls.base;
      if (!base) throw cerr('CS0117', `'object' does not contain a constructor that takes ${m.baseArgs.length} arguments`, m.line, 1, 'wrongArgs');
      this.checkCtorArgs(base, m.baseArgs, scope, m.line);
    }
    this.block(m.body.body, new Scope(scope));
    if (!isCtor && m.ret !== 'void' && !this.sawReturn) {
      throw cerr('CS0161', `'${this.cls.name}.${m.name}()': not all code paths return a value`, m.line, 1, 'missingReturn', { name: m.name });
    }
  }

  block(body: Stmt[], scope: Scope) {
    for (const s of body) this.stmt(s, scope);
  }

  declare(scope: Scope, name: string, type: string, assigned: boolean, line: number, col: number) {
    if (scope.find(name)) {
      throw cerr('CS0128', `A local variable named '${name}' is already defined in this scope`, line, col, 'duplicateVar', { name });
    }
    scope.vars.set(name, { type, assigned, line });
    if (this.inMain) this.stats.mainLocals[name] = type;
  }

  stmt(s: Stmt, scope: Scope): void {
    switch (s.k) {
      case 'block':
        return this.block(s.body, new Scope(scope));
      case 'empty':
        return;
      case 'decl': {
        let type = normalizeType(s.type);
        s.type = type;
        if (type !== 'var') this.checkTypeName(type, s.line);
        for (const d of s.decls) {
          if (type === 'var' && !d.init) {
            throw cerr('CS0818', 'Implicitly-typed variables must be initialized', d.line, d.col, 'varNoInit', { name: d.name });
          }
          let vt = type;
          if (d.init) {
            if (d.init.k === 'arrInit') {
              if (!type.endsWith('[]')) throw cerr('CS0622', 'Can only use array initializer expressions to assign to array types', d.line, d.col, 'typeMismatch', { from: 'array', to: type });
              const elem = type.slice(0, -2);
              for (const it of d.init.items) this.requireAssignable(elem, this.typeOf(it, scope), it, it.line);
            } else {
              const it = this.typeOf(d.init, scope, type);
              if (type === 'var') {
                if (it === 'null' || it === 'void') throw cerr('CS0815', `Cannot assign ${it} to an implicitly-typed variable`, d.line, d.col, 'typeMismatch', { from: it, to: 'var' });
                vt = it;
              } else this.requireAssignable(type, it, d.init, d.line);
            }
          }
          this.declare(scope, d.name, vt, !!d.init, d.line, d.col);
        }
        if (type === 'var') s.type = 'var';
        return;
      }
      case 'expr':
        this.typeOf(s.expr, scope);
        return;
      case 'if':
        this.stats.ifs++;
        if (s.else) this.stats.elses++;
        this.checkCondition(s.test, scope);
        if (s.then.k === 'empty') {
          this.warnings.push({ code: 'CS0642', message: 'Possible mistaken empty statement', line: s.line, col: 1, roast: 'emptyIf' });
        }
        this.stmt(s.then, new Scope(scope));
        if (s.else) this.stmt(s.else, new Scope(scope));
        return;
      case 'while':
      case 'doWhile':
        this.stats.loops++;
        this.checkCondition(s.test, scope);
        this.loopDepth++;
        this.stmt(s.body, new Scope(scope));
        this.loopDepth--;
        return;
      case 'for': {
        this.stats.loops++;
        const inner = new Scope(scope);
        if (s.init) this.stmt(s.init, inner);
        if (s.test) this.checkCondition(s.test, inner);
        for (const u of s.update) this.typeOf(u, inner);
        this.loopDepth++;
        this.stmt(s.body, new Scope(inner));
        this.loopDepth--;
        return;
      }
      case 'foreach': {
        this.stats.loops++;
        const it = this.typeOf(s.iter, scope);
        let elem = '?';
        if (it.endsWith('[]')) elem = it.slice(0, -2);
        else if (it === 'string') elem = 'char';
        else if (it !== '?') throw cerr('CS1579', `foreach statement cannot operate on variables of type '${it}'`, s.line, 1, 'typeMismatch', { from: it, to: 'array' });
        const inner = new Scope(scope);
        const t = normalizeType(s.type);
        s.type = t;
        if (t !== 'var') {
          this.checkTypeName(t, s.line);
          if (!this.assignable(t, elem)) throw cerr('CS0030', `Cannot convert type '${elem}' to '${t}'`, s.line, 1, 'typeMismatch', { from: elem, to: t });
        }
        this.declare(inner, s.name, t === 'var' ? elem : t, true, s.line, 1);
        this.loopDepth++;
        this.stmt(s.body, new Scope(inner));
        this.loopDepth--;
        return;
      }
      case 'return': {
        this.sawReturn = true;
        const ret = this.method.ret;
        if (s.value) {
          if (ret === 'void') throw cerr('CS0127', `Since '${this.method.name}' returns void, a return keyword must not be followed by an object expression`, s.line, 1, 'typeMismatch', { from: 'value', to: 'void' });
          this.requireAssignable(ret, this.typeOf(s.value, scope, ret), s.value, s.line);
        } else if (ret !== 'void') {
          throw cerr('CS0126', `An object of a type convertible to '${ret}' is required`, s.line, 1, 'missingReturn', { name: this.method.name });
        }
        return;
      }
      case 'break':
      case 'continue':
        if (this.loopDepth === 0) throw cerr('CS0139', `No enclosing loop out of which to break or continue`, s.line, 1, 'syntax');
        return;
    }
  }

  // ---------- expressions ----------
  numResult(a: string, b: string) {
    return a === 'double' || b === 'double' ? 'double' : 'int';
  }

  typeOf(e: Expr, scope: Scope, expected?: string): string {
    switch (e.k) {
      case 'lit':
        return e.type;
      case 'interp':
        for (const p of e.parts) if (typeof p !== 'string') {
          const t = this.typeOf(p, scope);
          if (t === 'void') throw cerr('CS0029', "Cannot implicitly convert type 'void' to 'object'", p.line, p.col, 'typeMismatch', { from: 'void', to: 'string' });
        }
        return 'string';
      case 'this':
        if (this.method.isStatic) throw cerr('CS0026', "Keyword 'this' is not valid in a static property, static method, or static field initializer", e.line, e.col, 'syntax');
        return this.cls.name;
      case 'base':
        if (!this.cls.base) throw cerr('CS0117', "'object' does not contain this member", e.line, e.col, 'unknownMember');
        return this.cls.base;
      case 'name':
        return this.nameType(e, scope, false);
      case 'member': {
        const r = this.resolveMember(e, scope);
        if (r.kind === 'method') {
          throw cerr('CS0428', `Cannot convert method group '${e.name}' to non-delegate type. Did you intend to invoke the method?`, e.line, e.col, 'missingParens', { name: e.name });
        }
        return r.type;
      }
      case 'call':
        return this.callType(e, scope);
      case 'index': {
        const ot = this.typeOf(e.obj, scope);
        const it = this.typeOf(e.index, scope);
        if (it !== 'int' && it !== '?' && it !== 'char') throw cerr('CS0029', `Cannot implicitly convert type '${it}' to 'int'`, e.line, e.col, 'typeMismatch', { from: it, to: 'int' });
        if (ot.endsWith('[]')) return ot.slice(0, -2);
        if (ot === 'string') return 'char';
        if (ot === '?') return '?';
        throw cerr('CS0021', `Cannot apply indexing with [] to an expression of type '${ot}'`, e.line, e.col, 'typeMismatch', { from: ot, to: 'array' });
      }
      case 'new': {
        e.type = normalizeType(e.type);
        this.stats.news++;
        if (!this.classes.has(e.type)) {
          const sug = this.suggestClass(e.type);
          throw cerr('CS0246', `The type or namespace name '${e.type}' could not be found`, e.line, e.col, sug ? 'casing' : 'unknownName', { name: e.type, suggest: sug ?? '' });
        }
        this.checkCtorArgs(e.type, e.args, scope, e.line);
        return e.type;
      }
      case 'newArr': {
        e.elem = normalizeType(e.elem);
        this.checkTypeName(e.elem, e.line);
        if (e.size) {
          const st = this.typeOf(e.size, scope);
          if (st !== 'int' && st !== '?') throw cerr('CS0029', `Cannot implicitly convert type '${st}' to 'int'`, e.line, e.col, 'typeMismatch', { from: st, to: 'int' });
        }
        for (const it of e.init ?? []) this.requireAssignable(e.elem, this.typeOf(it, scope), it, it.line);
        return e.elem + '[]';
      }
      case 'arrInit':
        if (expected?.endsWith('[]')) {
          for (const it of e.items) this.requireAssignable(expected.slice(0, -2), this.typeOf(it, scope), it, it.line);
          return expected;
        }
        throw cerr('CS0622', 'Can only use array initializer expressions to assign to array types', e.line, e.col, 'typeMismatch', { from: 'array', to: expected ?? '?' });
      case 'unary': {
        const t = this.typeOf(e.arg, scope);
        if (e.op === '!') {
          if (t !== 'bool' && t !== '?') throw cerr('CS0023', `Operator '!' cannot be applied to operand of type '${t}'`, e.line, e.col, 'typeMismatch', { from: t, to: 'bool' });
          return 'bool';
        }
        if (!NUMERIC.has(t) && t !== '?') throw cerr('CS0023', `Operator '${e.op}' cannot be applied to operand of type '${t}'`, e.line, e.col, 'stringMath', { op: e.op });
        return t === 'char' ? 'int' : t;
      }
      case 'incdec': {
        this.requireLvalue(e.arg, scope, true);
        const t = this.typeOf(e.arg, scope);
        if (!NUMERIC.has(t) && t !== '?') throw cerr('CS0023', `Operator '${e.op}' cannot be applied to operand of type '${t}'`, e.line, e.col, 'stringMath', { op: e.op });
        return t;
      }
      case 'bin':
        return this.binType(e, scope);
      case 'assign': {
        this.requireLvalue(e.target, scope, e.op === '=');
        const tt = this.typeOf(e.target, scope);
        const vt = this.typeOf(e.value, scope, tt);
        if (e.op === '=') this.requireAssignable(tt, vt, e.value, e.line);
        else if (e.op === '+=' && tt === 'string') {
          if (vt === 'void') this.requireAssignable(tt, vt, e.value, e.line);
        } else {
          if (!NUMERIC.has(tt) && tt !== '?') throw cerr('CS0019', `Operator '${e.op}' cannot be applied to operands of type '${tt}' and '${vt}'`, e.line, e.col, 'stringMath', { op: e.op });
          if (!NUMERIC.has(vt) && vt !== '?') throw cerr('CS0019', `Operator '${e.op}' cannot be applied to operands of type '${tt}' and '${vt}'`, e.line, e.col, 'stringMath', { op: e.op });
          if (tt === 'int' && vt === 'double') this.requireAssignable(tt, vt, e.value, e.line);
        }
        if (e.target.k === 'name') {
          const v = scope.find(e.target.name);
          if (v) v.assigned = true;
        }
        return tt;
      }
      case 'cond': {
        this.checkCondition(e.test, scope);
        const a = this.typeOf(e.a, scope, expected);
        const b = this.typeOf(e.b, scope, expected);
        if (this.assignable(a, b)) return a;
        if (this.assignable(b, a)) return b;
        throw cerr('CS0173', `Type of conditional expression cannot be determined because there is no implicit conversion between '${a}' and '${b}'`, e.line, e.col, 'typeMismatch', { from: b, to: a });
      }
      case 'cast': {
        const to = normalizeType(e.type);
        e.type = to;
        const from = this.typeOf(e.arg, scope);
        const ok = from === '?' || from === to || (NUMERIC.has(to) && NUMERIC.has(from)) || to === 'object' || to === 'string' && from === 'null';
        if (!ok) throw cerr('CS0030', `Cannot convert type '${from}' to '${to}'`, e.line, e.col, from === 'string' ? 'readLineToInt' : 'typeMismatch', { from, to });
        return to;
      }
    }
  }

  requireLvalue(t: Expr, scope: Scope, plainAssign: boolean) {
    if (t.k === 'name') {
      const v = scope.find(t.name);
      if (v) {
        if (!plainAssign && !v.assigned) {
          throw cerr('CS0165', `Use of unassigned local variable '${t.name}'`, t.line, t.col, 'unassigned', { name: t.name });
        }
        return;
      }
      this.nameType(t, scope, true);
      return;
    }
    if (t.k === 'member' || t.k === 'index') {
      if (t.k === 'member') {
        const r = this.resolveMember(t, scope);
        if (r.kind === 'field' && r.isProp && r.setAccess && !this.canAccess(r.setAccess, r.owner)) {
          throw cerr('CS0272', `The property '${t.name}' cannot be used in this context because the set accessor is inaccessible`, t.line, t.col, 'privateAccess', { name: t.name });
        }
        if (r.kind === 'field' && r.owner in this.statics) {
          throw cerr('CS0200', `Property or indexer '${r.owner}.${t.name}' cannot be assigned to -- it is read only`, t.line, t.col, 'syntax');
        }
        if (r.kind === 'field' && (r.type === 'int' && t.name === 'Length')) {
          throw cerr('CS0200', `Property or indexer 'Length' cannot be assigned to -- it is read only`, t.line, t.col, 'syntax');
        }
      }
      return;
    }
    throw cerr('CS0131', 'The left-hand side of an assignment must be a variable, property or indexer', t.line, t.col, 'syntax', { lhs: '1' });
  }

  nameType(e: Extract<Expr, { k: 'name' }>, scope: Scope, forWrite: boolean): string {
    const v = scope.find(e.name);
    if (v) {
      if (!forWrite && !v.assigned) {
        throw cerr('CS0165', `Use of unassigned local variable '${e.name}'`, e.line, e.col, 'unassigned', { name: e.name });
      }
      return v.type;
    }
    const f = this.findField(this.cls.name, e.name);
    if (f) {
      if (this.method.isStatic && !f.f.isStatic) {
        throw cerr('CS0120', `An object reference is required for the non-static field, method, or property '${this.cls.name}.${e.name}'`, e.line, e.col, 'unknownName', { name: e.name, staticCtx: '1' });
      }
      return f.f.type;
    }
    if (this.classes.has(e.name) || this.statics[e.name]) return '#' + e.name;
    // casing suggestions
    const lower = e.name.toLowerCase();
    const candidates = [...scope.all(), ...this.allFieldNames(), ...this.classes.keys(), ...Object.keys(this.statics)];
    const sug = candidates.find((c) => c.toLowerCase() === lower);
    if (sug) {
      throw cerr('CS0103', `The name '${e.name}' does not exist in the current context`, e.line, e.col, 'casing', { name: e.name, suggest: sug });
    }
    const near = candidates.find((c) => levenshtein(c.toLowerCase(), lower) <= 2 && c.length > 3);
    throw cerr('CS0103', `The name '${e.name}' does not exist in the current context`, e.line, e.col, 'unknownName', { name: e.name, suggest: near ?? '' });
  }

  allFieldNames(): string[] {
    const out: string[] = [];
    let cur: string | undefined = this.cls.name;
    while (cur) {
      const info = this.classes.get(cur);
      if (!info) break;
      out.push(...info.fields.keys(), ...info.methods.keys());
      cur = info.base;
    }
    return out;
  }

  resolveMember(e: Extract<Expr, { k: 'member' }>, scope: Scope): Resolved {
    const ot = this.typeOf(e.obj, scope);
    const name = e.name;
    const notFound = (typeName: string, names: string[]): never => {
      const sug = names.find((n) => n.toLowerCase() === name.toLowerCase());
      if (sug) {
        throw cerr('CS0117', `'${typeName}' does not contain a definition for '${name}'`, e.line, e.col, 'casing', { name, suggest: sug });
      }
      throw cerr('CS0117', `'${typeName}' does not contain a definition for '${name}'`, e.line, e.col, 'unknownMember', {
        name, type: typeName, available: names.join(', '),
      });
    };
    if (ot === '?') return { kind: 'field', type: '?', access: 'public', owner: '?', isStatic: false };
    if (ot.startsWith('#')) {
      const cn = ot.slice(1);
      const b = this.statics[cn];
      if (b) {
        if (b.methods[name]) return { kind: 'method', ret: b.methods[name].ret, owner: cn, access: 'public', builtin: b.methods[name], isStatic: true };
        if (b.fields[name]) return { kind: 'field', type: b.fields[name], owner: cn, access: 'public', isStatic: true };
        return notFound(cn, [...Object.keys(b.methods), ...Object.keys(b.fields)]);
      }
      const f = this.findField(cn, name);
      if (f) {
        if (!f.f.isStatic) throw cerr('CS0120', `An object reference is required for the non-static field, method, or property '${cn}.${name}'`, e.line, e.col, 'unknownName', { name, staticCtx: '1' });
        if (!this.canAccess(f.f.access, f.owner)) throw cerr('CS0122', `'${cn}.${name}' is inaccessible due to its protection level`, e.line, e.col, 'privateAccess', { name });
        return { kind: 'field', type: f.f.type, owner: f.owner, access: f.f.access, isStatic: true };
      }
      const m = this.findMethod(cn, name);
      if (m) {
        if (!m.m.isStatic) throw cerr('CS0120', `An object reference is required for the non-static field, method, or property '${cn}.${name}'`, e.line, e.col, 'unknownName', { name, staticCtx: '1' });
        if (!this.canAccess(m.m.access, m.owner)) throw cerr('CS0122', `'${cn}.${name}()' is inaccessible due to its protection level`, e.line, e.col, 'privateAccess', { name });
        return { kind: 'method', ret: m.m.ret, owner: m.owner, access: m.m.access, user: m.m, isStatic: true };
      }
      return notFound(cn, this.memberNames(cn));
    }
    if (ot === 'string') {
      if (STRING_MEMBERS.fields[name]) return { kind: 'field', type: STRING_MEMBERS.fields[name], owner: 'string', access: 'public', isStatic: false };
      if (STRING_MEMBERS.methods[name]) return { kind: 'method', ret: STRING_MEMBERS.methods[name].ret, owner: 'string', access: 'public', builtin: STRING_MEMBERS.methods[name], isStatic: false };
      return notFound('string', [...Object.keys(STRING_MEMBERS.fields), ...Object.keys(STRING_MEMBERS.methods)]);
    }
    if (ot.endsWith('[]')) {
      if (name === 'Length') return { kind: 'field', type: 'int', owner: 'array', access: 'public', isStatic: false };
      return notFound(ot, ['Length']);
    }
    if (this.classes.has(ot)) {
      const f = this.findField(ot, name);
      if (f) {
        if (f.f.isStatic) throw cerr('CS0176', `Member '${ot}.${name}' cannot be accessed with an instance reference; qualify it with a type name instead`, e.line, e.col, 'syntax');
        if (!this.canAccess(f.f.access, f.owner)) throw cerr('CS0122', `'${f.owner}.${name}' is inaccessible due to its protection level`, e.line, e.col, 'privateAccess', { name, owner: f.owner });
        return { kind: 'field', type: f.f.type, owner: f.owner, access: f.f.access, isStatic: false, isProp: f.f.isProp, setAccess: f.f.setAccess };
      }
      const m = this.findMethod(ot, name);
      if (m) {
        if (!this.canAccess(m.m.access, m.owner)) throw cerr('CS0122', `'${m.owner}.${name}()' is inaccessible due to its protection level`, e.line, e.col, 'privateAccess', { name, owner: m.owner });
        return { kind: 'method', ret: m.m.ret, owner: m.owner, access: m.m.access, user: m.m, isStatic: m.m.isStatic };
      }
      if (name === 'ToString') return { kind: 'method', ret: 'string', owner: ot, access: 'public', builtin: { ret: 'string', min: 0, max: 0 }, isStatic: false };
      return notFound(ot, this.memberNames(ot));
    }
    if (name === 'ToString') return { kind: 'method', ret: 'string', owner: ot, access: 'public', builtin: { ret: 'string', min: 0, max: 0 }, isStatic: false };
    if (ot === 'void') throw cerr('CS0023', "Operator '.' cannot be applied to operand of type 'void'", e.line, e.col, 'typeMismatch', { from: 'void', to: 'object' });
    return notFound(ot, []);
  }

  memberNames(cls: string): string[] {
    const out: string[] = [];
    let cur: string | undefined = cls;
    while (cur) {
      const info = this.classes.get(cur);
      if (!info) break;
      out.push(...info.fields.keys(), ...info.methods.keys());
      cur = info.base;
    }
    return out;
  }

  checkArgs(params: string[] | undefined, args: Expr[], scope: Scope, min: number, max: number, name: string, line: number): string[] {
    if (args.length < min || args.length > max) {
      throw cerr('CS1501', `No overload for method '${name}' takes ${args.length} arguments`, line, 1, 'wrongArgs', { name, count: String(args.length), expected: min === max ? String(min) : `${min}-${max}` });
    }
    const types = args.map((a, i) => this.typeOf(a, scope, params?.[i]));
    types.forEach((t, i) => {
      if (t === 'void') throw cerr('CS1503', `Argument ${i + 1}: cannot convert from 'void' to 'object'`, line, args[i].col, 'typeMismatch', { from: 'void', to: 'object' });
      const p = params?.[i];
      if (p && p !== '?' && !this.assignable(p, t)) {
        throw cerr('CS1503', `Argument ${i + 1}: cannot convert from '${t}' to '${p}'`, line, args[i].col, 'typeMismatch', { from: t, to: p, arg: String(i + 1), name });
      }
    });
    return types;
  }

  checkCtorArgs(cls: string, args: Expr[], scope: Scope, line: number) {
    const info = this.classes.get(cls)!;
    const ctors = info.decl.ctors;
    if (ctors.length === 0) {
      this.checkArgs([], args, scope, 0, 0, cls, line);
      return;
    }
    const match = ctors.find((c) => c.params.length === args.length);
    if (!match) {
      throw cerr('CS1729', `'${cls}' does not contain a constructor that takes ${args.length} arguments`, line, 1, 'wrongArgs', { name: cls, count: String(args.length), expected: ctors.map((c) => c.params.length).join('/') });
    }
    if (match.access === 'private' && this.cls.name !== cls) {
      throw cerr('CS0122', `'${cls}.${cls}()' is inaccessible due to its protection level`, line, 1, 'privateAccess', { name: cls });
    }
    this.checkArgs(match.params.map((p) => p.type), args, scope, args.length, args.length, cls, line);
  }

  callType(e: Extract<Expr, { k: 'call' }>, scope: Scope): string {
    const c = e.callee;
    if (c.k === 'name') {
      const m = this.findMethod(this.cls.name, c.name);
      if (!m) {
        // maybe a local variable used like a method, or a missing method
        const sug = this.allFieldNames().find((n) => n.toLowerCase() === c.name.toLowerCase());
        throw cerr('CS0103', `The name '${c.name}' does not exist in the current context`, c.line, c.col, sug ? 'casing' : 'unknownName', { name: c.name, suggest: sug ?? '' });
      }
      if (this.method.isStatic && !m.m.isStatic) {
        throw cerr('CS0120', `An object reference is required for the non-static field, method, or property '${this.cls.name}.${c.name}()'`, c.line, c.col, 'unknownName', { name: c.name, staticCtx: '1' });
      }
      this.countCall(c.name);
      this.checkArgs(m.m.params.map((p) => p.type), e.args, scope, m.m.params.length, m.m.params.length, c.name, e.line);
      return m.m.ret;
    }
    if (c.k === 'member') {
      const r = this.resolveMember(c, scope);
      if (r.kind !== 'method') {
        throw cerr('CS1955', `Non-invocable member '${c.name}' cannot be used like a method`, c.line, c.col, 'missingParens', { name: c.name, notMethod: '1' });
      }
      this.countCall(`${c.obj.k === 'name' ? c.obj.name : '?'}.${c.name}`);
      // remember the static owner so the interpreter can dispatch like C# (virtual/override vs hiding)
      if (r.user) (e as { owner?: string }).owner = r.owner;
      if (r.user) {
        this.checkArgs(r.user.params.map((p) => p.type), e.args, scope, r.user.params.length, r.user.params.length, c.name, e.line);
        return r.user.ret;
      }
      const b = r.builtin!;
      const types = this.checkArgs(b.params, e.args, scope, b.min, b.max, c.name, e.line);
      if (b.ret === 'num') return types.some((t) => t === 'double') ? 'double' : 'int';
      return b.ret;
    }
    throw cerr('CS0149', 'Method name expected', e.line, e.col, 'syntax');
  }

  countCall(name: string) {
    this.stats.calls[name] = (this.stats.calls[name] ?? 0) + 1;
  }

  binType(e: Extract<Expr, { k: 'bin' }>, scope: Scope): string {
    const l = this.typeOf(e.l, scope);
    const r = this.typeOf(e.r, scope);
    const bad = (roast: 'stringMath' | 'typeMismatch' = 'typeMismatch'): never => {
      throw cerr('CS0019', `Operator '${e.op}' cannot be applied to operands of type '${l}' and '${r}'`, e.line, e.col, roast, { op: e.op, from: l, to: r });
    };
    if (l === 'void' || r === 'void') bad();
    const unk = l === '?' || r === '?';
    switch (e.op) {
      case '+':
        if (l === 'string' || r === 'string') return 'string';
        if (unk) return '?';
        if (NUMERIC.has(l) && NUMERIC.has(r)) return this.numResult(l, r);
        return bad();
      case '-': case '*': case '/': case '%':
        if (unk) return '?';
        if (NUMERIC.has(l) && NUMERIC.has(r)) return this.numResult(l, r);
        return bad(l === 'string' || r === 'string' ? 'stringMath' : 'typeMismatch');
      case '<': case '>': case '<=': case '>=':
        if (unk) return 'bool';
        if (NUMERIC.has(l) && NUMERIC.has(r)) return 'bool';
        return bad(l === 'string' || r === 'string' ? 'stringMath' : 'typeMismatch');
      case '==': case '!=':
        if (unk || this.assignable(l, r) || this.assignable(r, l) || (NUMERIC.has(l) && NUMERIC.has(r))) return 'bool';
        return bad();
      case '&&': case '||':
        if (e.op === '&&') this.stats.usesAnd++;
        else this.stats.usesOr++;
        if ((l === 'bool' || l === '?') && (r === 'bool' || r === '?')) return 'bool';
        return bad();
    }
    return '?';
  }
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}
