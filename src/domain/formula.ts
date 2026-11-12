/**
 * Small parser and evaluator for money formulas such as
 * "(max_score - min_score) * 2". No eval, no dynamic code.
 */

export type FormulaVars = {
  max_score: number
  min_score: number
  total: number
  players: number
}

type Node =
  | { t: 'num'; v: number }
  | { t: 'var'; name: keyof FormulaVars }
  | { t: 'neg'; a: Node }
  | { t: 'bin'; op: '+' | '-' | '*' | '/' | '^'; a: Node; b: Node }
  | { t: 'call'; fn: (x: number) => number; a: Node }

const VARIABLES: Record<string, keyof FormulaVars> = {
  max_score: 'max_score',
  min_score: 'min_score',
  max: 'max_score',
  min: 'min_score',
  total: 'total',
  players: 'players',
}

const FUNCTIONS: Record<string, (x: number) => number> = {
  abs: Math.abs,
  sqrt: Math.sqrt,
  round: Math.round,
  floor: Math.floor,
  ceil: Math.ceil,
}

export const FORMULA_VARIABLES = ['max_score', 'min_score', 'total', 'players'] as const
export const FORMULA_FUNCTIONS = Object.keys(FUNCTIONS)

/** What is wrong with a formula, as a code the UI turns into a sentence. */
export type FormulaProblem =
  | { code: 'unexpected' | 'expected' | 'unknownFunction' | 'unknownName'; token: string }
  | { code: 'endsEarly' | 'empty' | 'notANumber' | 'invalid' }

export class FormulaError extends Error {
  constructor(readonly problem: FormulaProblem) {
    super('token' in problem ? `${problem.code}: ${problem.token}` : problem.code)
  }
}

type Token = { k: 'num'; v: number } | { k: 'id'; v: string } | { k: 'op'; v: string }

function tokenize(src: string): Token[] {
  const tokens: Token[] = []
  const re = /\s*(?:(\d+(?:\.\d+)?|\.\d+)|([A-Za-z_][A-Za-z0-9_]*)|([-+*/^()×÷−]))/y
  let pos = 0
  while (pos < src.length) {
    if (/^\s*$/.test(src.slice(pos))) break
    re.lastIndex = pos
    const m = re.exec(src)
    if (!m) throw new FormulaError({ code: 'unexpected', token: src.slice(pos).trim()[0] ?? '' })
    if (m[1] !== undefined) tokens.push({ k: 'num', v: Number(m[1]) })
    else if (m[2] !== undefined) tokens.push({ k: 'id', v: m[2].toLowerCase() })
    else {
      const op = m[3]!
      tokens.push({ k: 'op', v: op === '×' ? '*' : op === '÷' ? '/' : op === '−' ? '-' : op })
    }
    pos = re.lastIndex
  }
  return tokens
}

function parse(src: string): Node {
  const tokens = tokenize(src)
  let i = 0
  const peekOp = (v: string) => {
    const t = tokens[i]
    return t !== undefined && t.k === 'op' && t.v === v
  }
  const expectOp = (v: string) => {
    if (!peekOp(v)) throw new FormulaError({ code: 'expected', token: v })
    i++
  }

  function expr(): Node {
    let a = term()
    while (peekOp('+') || peekOp('-')) {
      const op = (tokens[i++] as { v: '+' | '-' }).v
      a = { t: 'bin', op, a, b: term() }
    }
    return a
  }
  function term(): Node {
    let a = unary()
    while (peekOp('*') || peekOp('/')) {
      const op = (tokens[i++] as { v: '*' | '/' }).v
      a = { t: 'bin', op, a, b: unary() }
    }
    return a
  }
  function unary(): Node {
    if (peekOp('-')) {
      i++
      return { t: 'neg', a: unary() }
    }
    if (peekOp('+')) {
      i++
      return unary()
    }
    return power()
  }
  function power(): Node {
    const a = primary()
    if (peekOp('^')) {
      i++
      return { t: 'bin', op: '^', a, b: unary() }
    }
    return a
  }
  function primary(): Node {
    const tok = tokens[i]
    if (tok === undefined) throw new FormulaError({ code: 'endsEarly' })
    if (tok.k === 'num') {
      i++
      return { t: 'num', v: tok.v }
    }
    if (tok.k === 'id') {
      i++
      if (peekOp('(')) {
        const fn = FUNCTIONS[tok.v]
        if (!fn) throw new FormulaError({ code: 'unknownFunction', token: tok.v })
        i++
        const a = expr()
        expectOp(')')
        return { t: 'call', fn, a }
      }
      const name = VARIABLES[tok.v]
      if (!name) throw new FormulaError({ code: 'unknownName', token: tok.v })
      return { t: 'var', name }
    }
    if (tok.v === '(') {
      i++
      const a = expr()
      expectOp(')')
      return a
    }
    throw new FormulaError({ code: 'unexpected', token: tok.v })
  }

  if (tokens.length === 0) throw new FormulaError({ code: 'empty' })
  const root = expr()
  const extra = tokens[i]
  if (extra !== undefined) throw new FormulaError({ code: 'unexpected', token: String(extra.v) })
  return root
}

function evalNode(n: Node, vars: FormulaVars): number {
  switch (n.t) {
    case 'num':
      return n.v
    case 'var':
      return vars[n.name]
    case 'neg':
      return -evalNode(n.a, vars)
    case 'call':
      return n.fn(evalNode(n.a, vars))
    case 'bin': {
      const a = evalNode(n.a, vars)
      const b = evalNode(n.b, vars)
      switch (n.op) {
        case '+':
          return a + b
        case '-':
          return a - b
        case '*':
          return a * b
        case '/':
          return a / b
        case '^':
          return a ** b
      }
    }
  }
}

/** Returns what is wrong with the formula, or null when it is valid. */
export function validateFormula(src: string): FormulaProblem | null {
  try {
    parse(src)
    return null
  } catch (e) {
    return e instanceof FormulaError ? e.problem : { code: 'invalid' }
  }
}

/**
 * Evaluates a formula. Throws FormulaError when it does not parse or the result
 * is not a finite number (for example division by zero).
 */
export function evaluateFormula(src: string, vars: FormulaVars): number {
  const value = evalNode(parse(src), vars)
  if (!Number.isFinite(value)) throw new FormulaError({ code: 'notANumber' })
  // Remove floating point noise such as 0.1 + 0.2.
  return Math.round(value * 1e6) / 1e6
}
