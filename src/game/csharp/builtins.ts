/**
 * Built-in library surface the simulated compiler knows about,
 * plus the per-level game API (Robot.*, Sensor.*).
 */

export interface BuiltinMethod {
  /** return type; 'num' = int unless an argument is double */
  ret: string;
  min: number;
  max: number;
  /** expected parameter types ('?' = anything) */
  params?: string[];
}

export interface BuiltinClass {
  methods: Record<string, BuiltinMethod>;
  fields: Record<string, string>;
}

export const STATIC_CLASSES: Record<string, BuiltinClass> = {
  Console: {
    methods: {
      WriteLine: { ret: 'void', min: 0, max: 20 },
      Write: { ret: 'void', min: 1, max: 20 },
      ReadLine: { ret: 'string', min: 0, max: 0 },
      Clear: { ret: 'void', min: 0, max: 0 },
    },
    fields: {},
  },
  int: {
    methods: { Parse: { ret: 'int', min: 1, max: 1, params: ['string'] } },
    fields: { MaxValue: 'int', MinValue: 'int' },
  },
  double: {
    methods: { Parse: { ret: 'double', min: 1, max: 1, params: ['string'] } },
    fields: {},
  },
  Convert: {
    methods: {
      ToInt32: { ret: 'int', min: 1, max: 1 },
      ToDouble: { ret: 'double', min: 1, max: 1 },
      ToString: { ret: 'string', min: 1, max: 1 },
    },
    fields: {},
  },
  Math: {
    methods: {
      Max: { ret: 'num', min: 2, max: 2, params: ['double', 'double'] },
      Min: { ret: 'num', min: 2, max: 2, params: ['double', 'double'] },
      Abs: { ret: 'num', min: 1, max: 1, params: ['double'] },
      Pow: { ret: 'double', min: 2, max: 2, params: ['double', 'double'] },
      Sqrt: { ret: 'double', min: 1, max: 1, params: ['double'] },
      Round: { ret: 'double', min: 1, max: 2, params: ['double', 'int'] },
      Floor: { ret: 'double', min: 1, max: 1, params: ['double'] },
      Ceiling: { ret: 'double', min: 1, max: 1, params: ['double'] },
    },
    fields: { PI: 'double' },
  },
  string: {
    methods: { IsNullOrEmpty: { ret: 'bool', min: 1, max: 1, params: ['string'] } },
    fields: {},
  },
};

export const STRING_MEMBERS: BuiltinClass = {
  fields: { Length: 'int' },
  methods: {
    ToUpper: { ret: 'string', min: 0, max: 0 },
    ToLower: { ret: 'string', min: 0, max: 0 },
    Trim: { ret: 'string', min: 0, max: 0 },
    Contains: { ret: 'bool', min: 1, max: 1, params: ['string'] },
    StartsWith: { ret: 'bool', min: 1, max: 1, params: ['string'] },
    EndsWith: { ret: 'bool', min: 1, max: 1, params: ['string'] },
    IndexOf: { ret: 'int', min: 1, max: 1, params: ['string'] },
    Substring: { ret: 'string', min: 1, max: 2, params: ['int', 'int'] },
    Replace: { ret: 'string', min: 2, max: 2, params: ['string', 'string'] },
    Equals: { ret: 'bool', min: 1, max: 1 },
    ToString: { ret: 'string', min: 0, max: 0 },
  },
};

/** Game API exposed to the student for a given level. */
export interface GameApi {
  /** Robot action methods, e.g. ['Dash', 'Shield'] — all return void */
  Robot?: string[];
  /** Sensor getters with their return types */
  Sensor?: Record<string, 'string' | 'int' | 'bool' | 'double'>;
}

export function apiClasses(api: GameApi): Record<string, BuiltinClass> {
  const out: Record<string, BuiltinClass> = {};
  if (api.Robot) {
    out.Robot = { fields: {}, methods: {} };
    for (const m of api.Robot) out.Robot.methods[m] = { ret: 'void', min: 0, max: 3 };
  }
  if (api.Sensor) {
    out.Sensor = { fields: {}, methods: {} };
    for (const [m, t] of Object.entries(api.Sensor)) out.Sensor.methods[m] = { ret: t, min: 0, max: 0 };
  }
  return out;
}

const TYPE_ALIASES: Record<string, string> = {
  String: 'string',
  Int32: 'int',
  Boolean: 'bool',
  Double: 'double',
  Char: 'char',
  Object: 'object',
  float: 'double',
  Single: 'double',
  long: 'int',
  Int64: 'int',
};

export function normalizeType(t: string): string {
  const arr = t.endsWith('[]');
  const base = arr ? t.slice(0, -2) : t;
  const n = TYPE_ALIASES[base] ?? base;
  return arr ? normalizeType(n) + '[]' : n;
}

export const PRIMITIVES = new Set(['int', 'double', 'string', 'bool', 'char', 'object']);
export const NUMERIC = new Set(['int', 'double', 'char']);
