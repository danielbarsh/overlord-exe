import type { Access, ClassDecl, Expr, FieldDecl, MethodDecl, Param, Program, Stmt, VarDeclarator } from './ast';
import { cerr } from './errors';
import { lex, type Tok } from './lexer';

export const TYPE_KWS = new Set(['int', 'string', 'bool', 'double', 'float', 'char', 'long', 'object', 'var']);
const MODIFIERS = new Set(['public', 'private', 'protected', 'internal', 'static', 'virtual', 'override', 'abstract', 'readonly', 'const']);
const ASSIGN_OPS = new Set(['=', '+=', '-=', '*=', '/=', '%=']);

export class Parser {
  private p = 0;
  constructor(private toks: Tok[], private lineOffset = 0, private colOffset = 0) {}

  // ---------- token helpers ----------
  private peek(o = 0): Tok {
    return this.toks[Math.min(this.p + o, this.toks.length - 1)];
  }
  private prev(): Tok {
    return this.toks[Math.max(0, this.p - 1)];
  }
  private next(): Tok {
    const t = this.peek();
    if (t.t !== 'eof') this.p++;
    return t;
  }
  private is(v: string, o = 0): boolean {
    const t = this.peek(o);
    return (t.t === 'op' || t.t === 'kw') && t.v === v;
  }
  private eat(v: string): boolean {
    if (this.is(v)) {
      this.p++;
      return true;
    }
    return false;
  }
  private L(t: Tok) {
    return t.line + this.lineOffset;
  }
  private C(t: Tok) {
    return t.line === 1 ? t.col + this.colOffset : t.col;
  }

  private expect(v: string): Tok {
    if (this.is(v)) return this.next();
    const got = this.peek();
    const pv = this.prev();
    const gotS = got.t === 'eof' ? 'end of file' : `'${got.v}'`;
    switch (v) {
      case ';':
        throw cerr('CS1002', '; expected', this.L(pv), pv.endCol, 'missingSemicolon', { line: String(this.L(pv)) });
      case ')':
        throw cerr('CS1026', ') expected', this.L(pv), pv.endCol, 'unclosedParen', { line: String(this.L(pv)) });
      case '}':
        throw cerr('CS1513', '} expected', this.L(pv), pv.endCol, 'unclosedBrace', { line: String(this.L(pv)) });
      case '(':
        throw cerr('CS1003', `Syntax error, '(' expected, got ${gotS}`, this.L(got), this.C(got), 'missingParens');
      default:
        throw cerr('CS1003', `Syntax error, '${v}' expected, got ${gotS}`, this.L(got), this.C(got), 'syntax', { expected: v });
    }
  }
  private ident(what = 'identifier'): Tok {
    const t = this.peek();
    if (t.t === 'ident') return this.next();
    throw cerr('CS1001', `${what} expected, got '${t.v}'`, this.L(t), this.C(t), 'syntax', {
      expected: what,
    });
  }

  // ---------- program ----------
  parseProgram(): Program {
    const usings: string[] = [];
    while (this.is('using')) {
      this.next();
      let name = this.ident('namespace').v;
      while (this.eat('.')) name += '.' + this.ident().v;
      this.expect(';');
      usings.push(name);
    }
    const classes: ClassDecl[] = [];
    let nsBraced = false;
    if (this.is('namespace')) {
      this.next();
      this.ident('namespace');
      while (this.eat('.')) this.ident();
      if (!this.eat(';')) {
        this.expect('{');
        nsBraced = true;
      }
    }
    // top-level statements (C# 9) — wrap them into a synthetic Main
    if (!this.isClassStart() && this.peek().t !== 'eof') {
      const startLine = this.L(this.peek());
      const body: Stmt[] = [];
      while (this.peek().t !== 'eof' && !this.isClassStart()) body.push(this.parseStatement());
      classes.push({
        name: 'Program',
        line: startLine,
        fields: [],
        ctors: [],
        methods: [
          {
            name: 'Main', ret: 'void', params: [], access: 'private', isStatic: true, isVirtual: false, isOverride: false,
            line: startLine, body: { k: 'block', body, line: startLine },
          },
        ],
      });
    }
    while (this.peek().t !== 'eof' && !(nsBraced && this.is('}'))) {
      classes.push(this.parseClass());
    }
    if (nsBraced) this.expect('}');
    if (this.peek().t !== 'eof') {
      const t = this.peek();
      throw cerr('CS1022', 'Type or namespace definition, or end-of-file expected', this.L(t), this.C(t), 'extraBrace', { line: String(this.L(t)) });
    }
    return { usings, classes };
  }

  private isClassStart(): boolean {
    let o = 0;
    while (this.peek(o).t === 'kw' && MODIFIERS.has(this.peek(o).v)) o++;
    return this.is('class', o);
  }

  private parseModifiers() {
    const mods = new Set<string>();
    while (this.peek().t === 'kw' && MODIFIERS.has(this.peek().v)) mods.add(this.next().v);
    let access: Access = 'private';
    if (mods.has('public') || mods.has('internal')) access = 'public';
    else if (mods.has('protected')) access = 'protected';
    return { mods, access };
  }

  private parseClass(): ClassDecl {
    this.parseModifiers();
    const kw = this.peek();
    if (!this.is('class')) {
      throw cerr('CS0116', 'A namespace cannot directly contain members such as fields, methods or statements', this.L(kw), this.C(kw), 'outsideMain');
    }
    this.next();
    const name = this.ident('class name');
    let base: string | undefined;
    if (this.eat(':')) base = this.ident('base class name').v;
    this.expect('{');
    const cls: ClassDecl = { name: name.v, base, line: this.L(name), fields: [], methods: [], ctors: [] };
    while (!this.is('}') && this.peek().t !== 'eof') this.parseMember(cls);
    this.expect('}');
    return cls;
  }

  private parseMember(cls: ClassDecl) {
    const start = this.peek();
    const { mods, access } = this.parseModifiers();
    const isStatic = mods.has('static') || mods.has('const');
    // nested class
    if (this.is('class')) {
      throw cerr('CS1519', 'Nested classes are not supported in this terminal', this.L(start), this.C(start), 'syntax');
    }
    // constructor
    if (this.peek().t === 'ident' && this.peek().v === cls.name && this.is('(', 1)) {
      const nameTok = this.next();
      const params = this.parseParams();
      let baseArgs: Expr[] | undefined;
      if (this.eat(':')) {
        this.expect('base');
        this.expect('(');
        baseArgs = this.parseArgs();
      }
      const body = this.parseBlock();
      cls.ctors.push({
        name: cls.name, ret: 'void', params, body, access, isStatic: false, isVirtual: false, isOverride: false,
        line: this.L(nameTok), baseArgs,
      });
      return;
    }
    let ret: string;
    const tt = this.peek();
    if (this.is('void')) {
      this.next();
      ret = 'void';
    } else if ((tt.t === 'kw' && TYPE_KWS.has(tt.v)) || tt.t === 'ident') {
      ret = this.parseType();
    } else {
      throw cerr('CS1519', `Invalid token '${tt.v}' in class, record, struct, or interface member declaration`, this.L(tt), this.C(tt), 'outsideMain');
    }
    // statement written directly in class body, e.g. Console.WriteLine(...)
    if (this.is('.') || this.is('(')) {
      throw cerr('CS1519', `Invalid token '${this.peek().v}' in class member declaration`, this.L(tt), this.C(tt), 'outsideMain');
    }
    const nameTok = this.ident('member name');
    if (this.is('(')) {
      const params = this.parseParams();
      const body = this.parseBlock();
      cls.methods.push({
        name: nameTok.v, ret, params, body, access, isStatic,
        isVirtual: mods.has('virtual') || mods.has('abstract'), isOverride: mods.has('override'), line: this.L(nameTok),
      });
      return;
    }
    if (this.is('{')) {
      // auto property
      this.next();
      let setAccess: Access = access;
      let sawSet = false;
      while (!this.is('}')) {
        const m = this.parseModifiers();
        const acc = this.ident('get or set');
        if (acc.v === 'set' || acc.v === 'init') {
          sawSet = true;
          if (m.mods.size) setAccess = m.access;
        } else if (acc.v !== 'get') {
          throw cerr('CS1014', 'A get or set accessor expected', this.L(acc), this.C(acc), 'syntax');
        }
        this.expect(';');
      }
      this.expect('}');
      let init: Expr | undefined;
      if (this.eat('=')) {
        init = this.parseExpr();
        this.expect(';');
      }
      cls.fields.push({ name: nameTok.v, type: ret, access, isStatic, init, line: this.L(nameTok), isProp: true, setAccess: sawSet ? setAccess : 'private' });
      return;
    }
    if (ret === 'void') {
      throw cerr('CS1547', "Keyword 'void' cannot be used in this context", this.L(tt), this.C(tt), 'syntax');
    }
    const push = (n: Tok, init?: Expr) =>
      cls.fields.push({ name: n.v, type: ret, access, isStatic, init, line: this.L(n) } as FieldDecl);
    let curName = nameTok;
    while (true) {
      let init: Expr | undefined;
      if (this.eat('=')) init = this.is('{') ? this.parseArrInit() : this.parseExpr();
      push(curName, init);
      if (!this.eat(',')) break;
      curName = this.ident();
    }
    this.expect(';');
  }

  private parseParams(): Param[] {
    this.expect('(');
    const params: Param[] = [];
    if (!this.is(')')) {
      do {
        const type = this.parseType();
        const name = this.ident('parameter name').v;
        params.push({ type, name });
      } while (this.eat(','));
    }
    this.expect(')');
    return params;
  }

  private parseType(): string {
    const t = this.peek();
    let base: string;
    if (t.t === 'kw' && TYPE_KWS.has(t.v)) base = this.next().v;
    else if (t.t === 'ident') base = this.next().v;
    else throw cerr('CS1031', `Type expected, got '${t.v}'`, this.L(t), this.C(t), 'syntax');
    while (this.is('[') && this.is(']', 1)) {
      this.p += 2;
      base += '[]';
    }
    return base;
  }

  // ---------- statements ----------
  parseBlock(): Extract<Stmt, { k: 'block' }> {
    const open = this.expect('{');
    const body: Stmt[] = [];
    while (!this.is('}') && this.peek().t !== 'eof') body.push(this.parseStatement());
    this.expect('}');
    return { k: 'block', body, line: this.L(open) };
  }

  private isDeclStart(): boolean {
    const t0 = this.peek(), t1 = this.peek(1), t2 = this.peek(2);
    if (t0.t === 'kw' && TYPE_KWS.has(t0.v)) {
      // `int.Parse(...)` / `string.Join` are expressions, not declarations
      return !(t1.t === 'op' && t1.v === '.');
    }
    if (t0.t === 'ident' && t1.t === 'ident') return true;
    if (t0.t === 'ident' && t1.t === 'op' && t1.v === '[' && t2.t === 'op' && t2.v === ']') return true;
    return false;
  }

  parseStatement(): Stmt {
    const t = this.peek();
    const line = this.L(t);
    if (this.is('{')) return this.parseBlock();
    if (this.eat(';')) return { k: 'empty', line };
    if (this.is('if')) {
      this.next();
      this.expect('(');
      const test = this.parseExpr();
      this.expect(')');
      const then = this.parseStatement();
      let els: Stmt | undefined;
      if (this.eat('else')) els = this.parseStatement();
      return { k: 'if', test, then, else: els, line };
    }
    if (this.is('else')) {
      throw cerr('CS1525', "Invalid expression term 'else'", line, this.C(t), 'syntax', { orphanElse: '1' });
    }
    if (this.is('while')) {
      this.next();
      this.expect('(');
      const test = this.parseExpr();
      this.expect(')');
      return { k: 'while', test, body: this.parseStatement(), line };
    }
    if (this.is('do')) {
      this.next();
      const body = this.parseStatement();
      this.expect('while');
      this.expect('(');
      const test = this.parseExpr();
      this.expect(')');
      this.expect(';');
      return { k: 'doWhile', test, body, line };
    }
    if (this.is('for')) {
      this.next();
      this.expect('(');
      let init: Stmt | undefined;
      if (!this.is(';')) {
        if (this.isDeclStart()) init = this.parseDecl(false);
        else init = { k: 'expr', expr: this.parseExpr(), line };
      }
      this.expect(';');
      const test = this.is(';') ? undefined : this.parseExpr();
      this.expect(';');
      const update: Expr[] = [];
      if (!this.is(')')) {
        do update.push(this.parseExpr());
        while (this.eat(','));
      }
      this.expect(')');
      return { k: 'for', init, test, update, body: this.parseStatement(), line };
    }
    if (this.is('foreach')) {
      this.next();
      this.expect('(');
      const type = this.parseType();
      const name = this.ident().v;
      this.expect('in');
      const iter = this.parseExpr();
      this.expect(')');
      return { k: 'foreach', type, name, iter, body: this.parseStatement(), line };
    }
    if (this.is('return')) {
      this.next();
      const value = this.is(';') ? undefined : this.parseExpr();
      this.expect(';');
      return { k: 'return', value, line };
    }
    if (this.is('break')) {
      this.next();
      this.expect(';');
      return { k: 'break', line };
    }
    if (this.is('continue')) {
      this.next();
      this.expect(';');
      return { k: 'continue', line };
    }
    if (this.is('class') || (t.t === 'kw' && MODIFIERS.has(t.v))) {
      throw cerr('CS1513', '} expected', line, this.C(t), 'unclosedBrace', { line: String(line) });
    }
    if (this.isDeclStart()) {
      const d = this.parseDecl(true);
      return d;
    }
    // expression statement
    const expr = this.parseExpr();
    const nt = this.peek();
    if ((expr.k === 'member' || expr.k === 'name') && (nt.t === 'str' || nt.t === 'interp' || nt.t === 'num' || nt.t === 'ident')) {
      throw cerr('CS1002', '; expected', this.L(this.prev()), this.prev().endCol, 'missingParens', { line: String(line) });
    }
    if (!(expr.k === 'call' || expr.k === 'assign' || expr.k === 'incdec' || expr.k === 'new')) {
      const isEq = expr.k === 'bin' && expr.op === '==';
      throw cerr('CS0201', 'Only assignment, call, increment, decrement, await, and new object expressions can be used as a statement', line, this.C(t), 'badStatement', isEq ? { eq: '1' } : undefined);
    }
    this.expect(';');
    return { k: 'expr', expr, line };
  }

  private parseDecl(needSemi: boolean): Stmt {
    const t = this.peek();
    const type = this.parseType();
    const decls: VarDeclarator[] = [];
    do {
      const n = this.ident('variable name');
      let init: Expr | undefined;
      if (this.eat('=')) init = this.is('{') ? this.parseArrInit() : this.parseExpr();
      else if (this.is('==')) {
        const e = this.peek();
        throw cerr('CS1525', "Invalid expression term '=='", this.L(e), this.C(e), 'syntax', { declEq: '1' });
      }
      decls.push({ name: n.v, init, line: this.L(n), col: this.C(n) });
    } while (this.eat(','));
    if (needSemi) this.expect(';');
    return { k: 'decl', type, decls, line: this.L(t) };
  }

  private parseArrInit(): Expr {
    const open = this.expect('{');
    const items: Expr[] = [];
    if (!this.is('}')) {
      do {
        if (this.is('}')) break;
        items.push(this.parseExpr());
      } while (this.eat(','));
    }
    this.expect('}');
    return { k: 'arrInit', items, line: this.L(open), col: this.C(open) };
  }

  // ---------- expressions ----------
  parseExpr(): Expr {
    return this.parseAssign();
  }

  private parseAssign(): Expr {
    const left = this.parseCond();
    const t = this.peek();
    if (t.t === 'op' && ASSIGN_OPS.has(t.v)) {
      this.next();
      const value = this.parseAssign();
      if (!(left.k === 'name' || left.k === 'member' || left.k === 'index')) {
        throw cerr('CS0131', 'The left-hand side of an assignment must be a variable, property or indexer', this.L(t), this.C(t), 'syntax', { lhs: '1' });
      }
      return { k: 'assign', op: t.v, target: left, value, line: this.L(t), col: this.C(t) };
    }
    return left;
  }

  private parseCond(): Expr {
    const test = this.parseBinary(0);
    if (this.is('?')) {
      const q = this.next();
      const a = this.parseAssign();
      this.expect(':');
      const b = this.parseAssign();
      return { k: 'cond', test, a, b, line: this.L(q), col: this.C(q) };
    }
    return test;
  }

  private static LEVELS: string[][] = [['||'], ['&&'], ['==', '!='], ['<', '>', '<=', '>='], ['+', '-'], ['*', '/', '%']];

  private parseBinary(level: number): Expr {
    if (level >= Parser.LEVELS.length) return this.parseUnary();
    let left = this.parseBinary(level + 1);
    while (true) {
      const t = this.peek();
      if (t.t === 'op' && Parser.LEVELS[level].includes(t.v)) {
        this.next();
        const right = this.parseBinary(level + 1);
        left = { k: 'bin', op: t.v, l: left, r: right, line: this.L(t), col: this.C(t) };
      } else break;
    }
    return left;
  }

  private parseUnary(): Expr {
    const t = this.peek();
    if (t.t === 'op' && (t.v === '!' || t.v === '-' || t.v === '+')) {
      this.next();
      return { k: 'unary', op: t.v as '!' | '-' | '+', arg: this.parseUnary(), line: this.L(t), col: this.C(t) };
    }
    if (t.t === 'op' && (t.v === '++' || t.v === '--')) {
      this.next();
      return { k: 'incdec', op: t.v, prefix: true, arg: this.parseUnary(), line: this.L(t), col: this.C(t) };
    }
    // cast: (int)x
    if (this.is('(') && this.peek(1).t === 'kw' && TYPE_KWS.has(this.peek(1).v) && this.is(')', 2)) {
      this.next();
      const type = this.next().v;
      this.next();
      return { k: 'cast', type, arg: this.parseUnary(), line: this.L(t), col: this.C(t) };
    }
    return this.parsePostfix();
  }

  private parseArgs(): Expr[] {
    // assumes '(' already consumed
    const args: Expr[] = [];
    if (!this.is(')')) {
      do args.push(this.parseExpr());
      while (this.eat(','));
    }
    this.expect(')');
    return args;
  }

  private parsePostfix(): Expr {
    let e = this.parsePrimary();
    while (true) {
      const t = this.peek();
      if (this.is('.')) {
        this.next();
        const n = this.peek();
        if (n.t !== 'ident' && n.t !== 'kw') {
          throw cerr('CS1001', 'Identifier expected', this.L(n), this.C(n), 'syntax');
        }
        this.next();
        e = { k: 'member', obj: e, name: n.v, line: this.L(n), col: this.C(n) };
      } else if (this.is('(')) {
        this.next();
        e = { k: 'call', callee: e, args: this.parseArgs(), line: this.L(t), col: this.C(t) };
      } else if (this.is('[')) {
        this.next();
        const index = this.parseExpr();
        this.expect(']');
        e = { k: 'index', obj: e, index, line: this.L(t), col: this.C(t) };
      } else if (this.is('++') || this.is('--')) {
        this.next();
        e = { k: 'incdec', op: t.v as '++' | '--', prefix: false, arg: e, line: this.L(t), col: this.C(t) };
      } else break;
    }
    return e;
  }

  private parsePrimary(): Expr {
    const t = this.peek();
    const line = this.L(t), col = this.C(t);
    switch (t.t) {
      case 'num':
        this.next();
        return t.isDouble
          ? { k: 'lit', type: 'double', value: parseFloat(t.v), line, col }
          : { k: 'lit', type: 'int', value: parseInt(t.v, 10), line, col };
      case 'str':
        this.next();
        return { k: 'lit', type: 'string', value: t.v, line, col };
      case 'char':
        this.next();
        return { k: 'lit', type: 'char', value: t.v, line, col };
      case 'interp': {
        this.next();
        const parts: (string | Expr)[] = (t.parts ?? []).map((p) => {
          if (typeof p === 'string') return p;
          const sub = new Parser(lex(p.code), p.line - 1, p.col - 1);
          const e = sub.parseExpr();
          return e;
        });
        return { k: 'interp', parts, line, col };
      }
      case 'ident':
        this.next();
        return { k: 'name', name: t.v, line, col };
      case 'kw':
        if (t.v === 'true' || t.v === 'false') {
          this.next();
          return { k: 'lit', type: 'bool', value: t.v === 'true', line, col };
        }
        if (t.v === 'null') {
          this.next();
          return { k: 'lit', type: 'null', value: null, line, col };
        }
        if (t.v === 'this') {
          this.next();
          return { k: 'this', line, col };
        }
        if (t.v === 'base') {
          this.next();
          return { k: 'base', line, col };
        }
        if (TYPE_KWS.has(t.v) && this.is('.', 1)) {
          this.next();
          return { k: 'name', name: t.v, line, col };
        }
        if (t.v === 'new') {
          this.next();
          const tt = this.peek();
          let type: string;
          if ((tt.t === 'kw' && TYPE_KWS.has(tt.v)) || tt.t === 'ident') type = this.next().v;
          else throw cerr('CS1031', 'Type expected', this.L(tt), this.C(tt), 'syntax');
          if (this.is('[')) {
            this.next();
            if (this.eat(']')) {
              const init = this.parseArrInit() as Extract<Expr, { k: 'arrInit' }>;
              return { k: 'newArr', elem: type, init: init.items, line, col };
            }
            const size = this.parseExpr();
            this.expect(']');
            let init: Expr[] | undefined;
            if (this.is('{')) init = (this.parseArrInit() as Extract<Expr, { k: 'arrInit' }>).items;
            return { k: 'newArr', elem: type, size, init, line, col };
          }
          if (!this.is('(')) {
            const n = this.peek();
            throw cerr('CS1526', "A new expression requires an argument list or (), [], or {} after type", this.L(n), this.C(n), 'missingParens');
          }
          this.next();
          return { k: 'new', type, args: this.parseArgs(), line, col };
        }
        break;
      case 'op':
        if (t.v === '(') {
          this.next();
          const e = this.parseExpr();
          this.expect(')');
          return e;
        }
        break;
    }
    const what = t.t === 'eof' ? 'end of file' : t.v;
    throw cerr('CS1525', `Invalid expression term '${what}'`, line, col, 'syntax', { term: what });
  }
}

export function parseProgram(src: string): Program {
  const toks = lex(src);
  return new Parser(toks).parseProgram();
}

export type { MethodDecl };
