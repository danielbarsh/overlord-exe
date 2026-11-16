export type Access = 'public' | 'private' | 'protected';

export type Expr =
  | { k: 'lit'; type: 'int' | 'double' | 'string' | 'bool' | 'char' | 'null'; value: unknown; line: number; col: number }
  | { k: 'interp'; parts: (string | Expr)[]; line: number; col: number }
  | { k: 'name'; name: string; line: number; col: number }
  | { k: 'member'; obj: Expr; name: string; line: number; col: number }
  | { k: 'call'; callee: Expr; args: Expr[]; line: number; col: number }
  | { k: 'index'; obj: Expr; index: Expr; line: number; col: number }
  | { k: 'new'; type: string; args: Expr[]; line: number; col: number }
  | { k: 'newArr'; elem: string; size?: Expr; init?: Expr[]; line: number; col: number }
  | { k: 'arrInit'; items: Expr[]; line: number; col: number }
  | { k: 'unary'; op: '!' | '-' | '+'; arg: Expr; line: number; col: number }
  | { k: 'incdec'; op: '++' | '--'; prefix: boolean; arg: Expr; line: number; col: number }
  | { k: 'bin'; op: string; l: Expr; r: Expr; line: number; col: number }
  | { k: 'assign'; op: string; target: Expr; value: Expr; line: number; col: number }
  | { k: 'cond'; test: Expr; a: Expr; b: Expr; line: number; col: number }
  | { k: 'cast'; type: string; arg: Expr; line: number; col: number }
  | { k: 'this'; line: number; col: number }
  | { k: 'base'; line: number; col: number };

export interface VarDeclarator {
  name: string;
  init?: Expr;
  line: number;
  col: number;
}

export type Stmt =
  | { k: 'block'; body: Stmt[]; line: number }
  | { k: 'decl'; type: string; decls: VarDeclarator[]; line: number }
  | { k: 'expr'; expr: Expr; line: number }
  | { k: 'if'; test: Expr; then: Stmt; else?: Stmt; line: number }
  | { k: 'while'; test: Expr; body: Stmt; line: number }
  | { k: 'doWhile'; test: Expr; body: Stmt; line: number }
  | { k: 'for'; init?: Stmt; test?: Expr; update: Expr[]; body: Stmt; line: number }
  | { k: 'foreach'; type: string; name: string; iter: Expr; body: Stmt; line: number }
  | { k: 'return'; value?: Expr; line: number }
  | { k: 'break'; line: number }
  | { k: 'continue'; line: number }
  | { k: 'empty'; line: number };

export interface Param {
  type: string;
  name: string;
}

export interface FieldDecl {
  name: string;
  type: string;
  access: Access;
  isStatic: boolean;
  init?: Expr;
  line: number;
  /** auto-property `{ get; set; }` */
  isProp?: boolean;
  setAccess?: Access;
}

export interface MethodDecl {
  name: string;
  ret: string;
  params: Param[];
  body: Extract<Stmt, { k: 'block' }>;
  access: Access;
  isStatic: boolean;
  isVirtual: boolean;
  isOverride: boolean;
  line: number;
  /** constructors only: `: base(...)` */
  baseArgs?: Expr[];
}

export interface ClassDecl {
  name: string;
  base?: string;
  line: number;
  fields: FieldDecl[];
  methods: MethodDecl[];
  ctors: MethodDecl[];
}

export interface Program {
  usings: string[];
  classes: ClassDecl[];
}
