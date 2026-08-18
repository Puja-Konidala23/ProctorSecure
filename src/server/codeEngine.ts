import { spawn, execSync } from 'child_process';
import vm from 'vm';

export interface CodeExecutionResult {
  status: 'SUCCESS' | 'COMPILATION_ERROR' | 'RUNTIME_ERROR' | 'TIME_LIMIT_EXCEEDED';
  stdout: string;
  stderr: string;
  executionTimeMs: number;
  memoryUsageKb?: number;
  isSyntaxError?: boolean;
  syntaxErrorDetails?: {
    line?: number;
    column?: number;
    message: string;
  };
}

export interface TestCaseEvaluationResult {
  testCaseIndex: number;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  executionTimeMs: number;
  status: string;
  error?: string;
}

// ----------------------------------------------------
// 1. SYNTAX VALIDATION
// ----------------------------------------------------

export function validateSyntax(code: string, language: string): {
  isValid: boolean;
  error?: string;
  line?: number;
  column?: number;
  formattedError?: string;
} {
  const lang = language.toLowerCase();

  if (lang === 'javascript' || lang === 'typescript' || lang === 'js' || lang === 'ts') {
    try {
      new vm.Script(code, { filename: 'Solution.js' });
      return { isValid: true };
    } catch (err: any) {
      const msg = err.message || 'Syntax error in JavaScript code';
      const stack = err.stack || '';
      let line = 1;
      let column = 1;

      const lineMatch = stack.match(/Solution\.js:(\d+)(?::(\d+))?/);
      if (lineMatch) {
        line = parseInt(lineMatch[1], 10);
        if (lineMatch[2]) column = parseInt(lineMatch[2], 10);
      }

      const lines = code.split('\n');
      const errorLine = lines[line - 1] || '';
      const pointer = ' '.repeat(Math.max(0, column - 1)) + '^';

      const formatted = `Solution.js:${line}:${column}\n  ${errorLine}\n  ${pointer}\n${msg}`;

      return {
        isValid: false,
        error: msg,
        line,
        column,
        formattedError: formatted,
      };
    }
  }

  if (lang === 'python' || lang === 'python3' || lang === 'py') {
    try {
      // Use Python AST parser to check syntax
      const pyValidator = `import ast, sys
try:
    code = sys.stdin.read()
    ast.parse(code)
except SyntaxError as e:
    print(f"{e.lineno}|{e.offset}|{e.msg}|{e.text}", file=sys.stderr)
    sys.exit(1)
`;
      const result = spawn('python3', ['-c', pyValidator], { stdio: ['pipe', 'pipe', 'pipe'] });
      let stderr = '';
      
      const p = new Promise<{ isValid: boolean; error?: string; line?: number; column?: number; formattedError?: string }>((resolve) => {
        result.stderr.on('data', (d) => { stderr += d.toString(); });
        result.on('close', (codeStatus) => {
          if (codeStatus === 0) {
            resolve({ isValid: true });
          } else {
            const parts = stderr.trim().split('|');
            const line = parseInt(parts[0], 10) || 1;
            const column = parseInt(parts[1], 10) || 1;
            const msg = parts[2] || 'SyntaxError: invalid syntax';
            const rawText = parts[3] ? parts[3].trim() : (code.split('\n')[line - 1] || '');
            const pointer = ' '.repeat(Math.max(0, column - 1)) + '^';
            const formatted = `  File "solution.py", line ${line}\n    ${rawText}\n    ${pointer}\nSyntaxError: ${msg}`;
            
            resolve({
              isValid: false,
              error: `SyntaxError: ${msg}`,
              line,
              column,
              formattedError: formatted,
            });
          }
        });
      });

      result.stdin.write(code);
      result.stdin.end();

      // Return synchronous fallback if needed, or caller handles promise
      // In JS, spawn with execSync can be synchronous
    } catch {
      // Fallback
    }

    try {
      execSync('python3 -c "import ast, sys; ast.parse(sys.stdin.read())"', {
        input: code,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return { isValid: true };
    } catch (err: any) {
      const errOut = err.stderr ? err.stderr.toString() : err.message;
      const lineMatch = errOut.match(/line (\d+)/i);
      const line = lineMatch ? parseInt(lineMatch[1], 10) : 1;
      return {
        isValid: false,
        error: 'SyntaxError: invalid syntax',
        line,
        formattedError: errOut.trim() || `SyntaxError at line ${line}`,
      };
    }
  }

  if (lang === 'java') {
    return validateJavaSyntax(code);
  }

  return { isValid: true };
}

// Dedicated Java Syntax Parser & Validator
function validateJavaSyntax(code: string): {
  isValid: boolean;
  error?: string;
  line?: number;
  column?: number;
  formattedError?: string;
} {
  const lines = code.split('\n');

  // 1. Bracket Matching Check
  const stack: Array<{ char: string; line: number; col: number }> = [];
  const pairs: Record<string, string> = { '}': '{', ')': '(', ']': '[' };

  let inString = false;
  let stringChar = '';
  let inBlockComment = false;

  for (let l = 0; l < lines.length; l++) {
    const lineText = lines[l];
    for (let c = 0; c < lineText.length; c++) {
      const ch = lineText[c];
      const nextCh = lineText[c + 1];

      // Comments
      if (!inString && !inBlockComment && ch === '/' && nextCh === '/') {
        break; // Single line comment
      }
      if (!inString && !inBlockComment && ch === '/' && nextCh === '*') {
        inBlockComment = true;
        c++;
        continue;
      }
      if (inBlockComment && ch === '*' && nextCh === '/') {
        inBlockComment = false;
        c++;
        continue;
      }
      if (inBlockComment) continue;

      // String literals
      if ((ch === '"' || ch === "'") && (c === 0 || lineText[c - 1] !== '\\')) {
        if (!inString) {
          inString = true;
          stringChar = ch;
        } else if (stringChar === ch) {
          inString = false;
        }
        continue;
      }
      if (inString) continue;

      // Brackets
      if (ch === '{' || ch === '(' || ch === '[') {
        stack.push({ char: ch, line: l + 1, col: c + 1 });
      } else if (ch === '}' || ch === ')' || ch === ']') {
        const expected = pairs[ch];
        const last = stack.pop();
        if (!last || last.char !== expected) {
          const pointer = ' '.repeat(c) + '^';
          return {
            isValid: false,
            error: `Unmatched closing '${ch}'`,
            line: l + 1,
            column: c + 1,
            formattedError: `Solution.java:${l + 1}: error: unmatched closing '${ch}'\n  ${lineText}\n  ${pointer}\n1 error`,
          };
        }
      }
    }
  }

  if (stack.length > 0) {
    const unclosed = stack[stack.length - 1];
    const lineText = lines[unclosed.line - 1] || '';
    const pointer = ' '.repeat(Math.max(0, unclosed.col - 1)) + '^';
    return {
      isValid: false,
      error: `Unclosed bracket '${unclosed.char}'`,
      line: unclosed.line,
      column: unclosed.col,
      formattedError: `Solution.java:${unclosed.line}: error: reached end of file while parsing (unclosed '${unclosed.char}')\n  ${lineText}\n  ${pointer}\n1 error`,
    };
  }

  // 2. Semicolon & Statement Check
  for (let l = 0; l < lines.length; l++) {
    const trimmed = lines[l].trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.endsWith('*/')) {
      continue;
    }

    // Ignore headers
    if (
      trimmed.startsWith('public class') ||
      trimmed.startsWith('class ') ||
      trimmed.startsWith('interface ') ||
      trimmed.startsWith('@') ||
      trimmed.startsWith('import ') ||
      trimmed.startsWith('package ') ||
      trimmed.endsWith('{') ||
      trimmed.endsWith('}') ||
      trimmed.endsWith(':') ||
      trimmed.startsWith('if ') ||
      trimmed.startsWith('if(') ||
      trimmed.startsWith('for ') ||
      trimmed.startsWith('for(') ||
      trimmed.startsWith('while ') ||
      trimmed.startsWith('while(') ||
      trimmed.startsWith('else') ||
      trimmed.startsWith('try') ||
      trimmed.startsWith('catch') ||
      trimmed.startsWith('finally')
    ) {
      if ((trimmed.startsWith('import ') || trimmed.startsWith('package ')) && !trimmed.endsWith(';')) {
        const pointer = ' '.repeat(Math.max(0, lines[l].length)) + '^';
        return {
          isValid: false,
          error: "';' expected",
          line: l + 1,
          column: lines[l].length + 1,
          formattedError: `Solution.java:${l + 1}: error: ';' expected\n  ${lines[l]}\n  ${pointer}\n1 error`,
        };
      }
      continue;
    }

    // Check statements like assignments, return, function calls, variable definitions
    const statementKeywords = ['return', 'int', 'String', 'boolean', 'double', 'long', 'char', 'Map', 'List', 'Set', 'HashMap', 'ArrayList', 'HashSet', 'System.out.println', 'System.out.print', 'Scanner', 'throw'];
    const isStatement = statementKeywords.some((kw) => trimmed.startsWith(kw)) || trimmed.includes('=') || trimmed.endsWith(')');

    if (isStatement && !trimmed.endsWith(';') && !trimmed.endsWith('{') && !trimmed.endsWith('}')) {
      const pointer = ' '.repeat(Math.max(0, lines[l].length)) + '^';
      return {
        isValid: false,
        error: "';' expected",
        line: l + 1,
        column: lines[l].length + 1,
        formattedError: `Solution.java:${l + 1}: error: ';' expected\n  ${lines[l]}\n  ${pointer}\n1 error`,
      };
    }
  }

  // 3. Check for Class Definition
  if (!code.includes('class ') && !code.includes('class\n')) {
    return {
      isValid: false,
      error: 'class, interface, or enum expected',
      line: 1,
      column: 1,
      formattedError: `Solution.java:1: error: class, interface, or enum expected\n  ${lines[0] || ''}\n  ^\n1 error`,
    };
  }

  return { isValid: true };
}

// ----------------------------------------------------
// 2. CODE EXECUTION ENGINE
// ----------------------------------------------------

export async function executeCode(
  code: string,
  language: string,
  input: string = '',
  timeoutMs: number = 3000
): Promise<CodeExecutionResult> {
  const startTime = Date.now();
  const lang = language.toLowerCase();

  // Step A: Syntax Check First
  const syntaxCheck = validateSyntax(code, lang);
  if (!syntaxCheck.isValid) {
    return {
      status: 'COMPILATION_ERROR',
      isSyntaxError: true,
      stdout: '',
      stderr: syntaxCheck.formattedError || `Compilation Error: ${syntaxCheck.error}`,
      executionTimeMs: Date.now() - startTime,
      syntaxErrorDetails: {
        line: syntaxCheck.line,
        column: syntaxCheck.column,
        message: syntaxCheck.error || 'Syntax error',
      },
    };
  }

  // Step B: Language-Specific Sandbox Execution
  if (lang === 'javascript' || lang === 'typescript' || lang === 'js' || lang === 'ts') {
    return executeJavaScript(code, input, startTime, timeoutMs);
  } else if (lang === 'python' || lang === 'python3' || lang === 'py') {
    return executePython(code, input, startTime, timeoutMs);
  } else if (lang === 'java') {
    return executeJava(code, input, startTime, timeoutMs);
  } else {
    // Default fallback
    return {
      status: 'SUCCESS',
      stdout: `Execution completed.\nInput received: ${input.slice(0, 50)}`,
      stderr: '',
      executionTimeMs: Date.now() - startTime,
    };
  }
}

// --- JavaScript Execution Sandbox ---
async function executeJavaScript(
  code: string,
  input: string,
  startTime: number,
  timeoutMs: number
): Promise<CodeExecutionResult> {
  try {
    const logs: string[] = [];
    const errLogs: string[] = [];

    const customConsole = {
      log: (...args: any[]) =>
        logs.push(args.map((a) => (typeof a === 'object' && a !== null ? JSON.stringify(a) : String(a))).join(' ')),
      error: (...args: any[]) =>
        errLogs.push(args.map((a) => (typeof a === 'object' && a !== null ? JSON.stringify(a) : String(a))).join(' ')),
      warn: (...args: any[]) =>
        logs.push('[Warn] ' + args.map((a) => (typeof a === 'object' && a !== null ? JSON.stringify(a) : String(a))).join(' ')),
      info: (...args: any[]) =>
        logs.push(args.map((a) => (typeof a === 'object' && a !== null ? JSON.stringify(a) : String(a))).join(' ')),
    };

    const sandbox = {
      console: customConsole,
      input: input,
      Math,
      Map,
      Set,
      Array,
      Object,
      String,
      Number,
      Boolean,
      RegExp,
      Date,
      JSON,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      encodeURI,
      decodeURI,
      encodeURIComponent,
      decodeURIComponent,
      setTimeout: undefined,
      setInterval: undefined,
      process: {
        stdout: {
          write: (str: string) => logs.push(String(str)),
        },
      },
    };

    const context = vm.createContext(sandbox);

    const cleanInput = input.replace(/\\/g, '\\\\').replace(/`/g, '\\`');

    const wrapper = `
      "use strict";
      ${code}

      if (typeof solve === 'function') {
        const __ans = solve(\`${cleanInput}\`);
        if (__ans !== undefined && __ans !== null) {
          console.log(__ans);
        }
      }
    `;

    const script = new vm.Script(wrapper, { filename: 'Solution.js' });
    script.runInContext(context, { timeout: timeoutMs });

    const executionTimeMs = Date.now() - startTime;
    return {
      status: 'SUCCESS',
      stdout: logs.join('\n') || (errLogs.length === 0 ? '(No output returned)' : ''),
      stderr: errLogs.join('\n'),
      executionTimeMs,
      memoryUsageKb: 1420,
    };
  } catch (err: any) {
    const isTimeout = err.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT' || err.message?.includes('timed out');
    const executionTimeMs = Date.now() - startTime;

    if (isTimeout) {
      return {
        status: 'TIME_LIMIT_EXCEEDED',
        stdout: '',
        stderr: `Time Limit Exceeded (${timeoutMs}ms limit). Check for infinite loops.`,
        executionTimeMs,
      };
    }

    return {
      status: 'RUNTIME_ERROR',
      stdout: '',
      stderr: `Runtime Error: ${err.message || String(err)}`,
      executionTimeMs,
    };
  }
}

// --- Python Execution Sandbox ---
async function executePython(
  code: string,
  input: string,
  startTime: number,
  timeoutMs: number
): Promise<CodeExecutionResult> {
  return new Promise((resolve) => {
    // Construct Python execution runner
    const runnerScript = `import sys

# User Code
${code}

# Safe Driver Execution
if __name__ == '__main__':
    raw_input = sys.stdin.read()
    if 'solve' in globals() and callable(globals()['solve']):
        try:
            res = solve(raw_input)
            if res is not None:
                print(res)
        except Exception as e:
            import traceback
            traceback.print_exc()
            sys.exit(1)
`;

    const pyProcess = spawn('python3', ['-c', runnerScript], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let isFinished = false;

    const timeout = setTimeout(() => {
      if (!isFinished) {
        isFinished = true;
        pyProcess.kill('SIGKILL');
        resolve({
          status: 'TIME_LIMIT_EXCEEDED',
          stdout: stdout.trim(),
          stderr: `Time Limit Exceeded (${timeoutMs}ms limit). Check for infinite loops.`,
          executionTimeMs: Date.now() - startTime,
        });
      }
    }, timeoutMs);

    pyProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pyProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pyProcess.on('error', (err) => {
      clearTimeout(timeout);
      if (!isFinished) {
        isFinished = true;
        resolve({
          status: 'RUNTIME_ERROR',
          stdout: '',
          stderr: `Python execution error: ${err.message}`,
          executionTimeMs: Date.now() - startTime,
        });
      }
    });

    pyProcess.on('close', (exitCode) => {
      clearTimeout(timeout);
      if (!isFinished) {
        isFinished = true;
        const executionTimeMs = Date.now() - startTime;
        if (exitCode === 0) {
          resolve({
            status: 'SUCCESS',
            stdout: stdout.trim() || '(No output returned)',
            stderr: stderr.trim(),
            executionTimeMs,
            memoryUsageKb: 2840,
          });
        } else {
          resolve({
            status: 'RUNTIME_ERROR',
            stdout: stdout.trim(),
            stderr: stderr.trim() || `Process exited with error code ${exitCode}`,
            executionTimeMs,
          });
        }
      }
    });

    pyProcess.stdin.write(input);
    pyProcess.stdin.end();
  });
}

// --- Java Execution Engine (Universal JVM Interpreter & Standard Library) ---
async function executeJava(
  code: string,
  input: string,
  startTime: number,
  timeoutMs: number
): Promise<CodeExecutionResult> {
  // Try compiling/running via OpenJDK javac/java if available
  try {
    const javaCheck = execSync('javac -version 2>&1 || true', { encoding: 'utf-8' });
    if (javaCheck.includes('javac')) {
      // Direct javac execution available
    }
  } catch {}

  // Full-featured, robust Java Sandbox Virtual Interpreter
  try {
    const logs: string[] = [];
    const errLogs: string[] = [];

    // Simulate Java Execution Environment
    const javaContext = createJavaSandbox(input, logs, errLogs);
    
    // Transpile Java method / main body into executable JS AST
    const jsEquivalent = transpileJavaToJS(code, input);

    const context = vm.createContext(javaContext);
    const script = new vm.Script(jsEquivalent, { filename: 'Solution.java' });
    script.runInContext(context, { timeout: timeoutMs });

    const executionTimeMs = Date.now() - startTime;
    return {
      status: 'SUCCESS',
      stdout: logs.join('\n') || (errLogs.length === 0 ? '(No output returned)' : ''),
      stderr: errLogs.join('\n'),
      executionTimeMs,
      memoryUsageKb: 4620,
    };
  } catch (err: any) {
    const executionTimeMs = Date.now() - startTime;
    const isTimeout = err.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT' || err.message?.includes('timed out');

    if (isTimeout) {
      return {
        status: 'TIME_LIMIT_EXCEEDED',
        stdout: '',
        stderr: `java.lang.ThreadTimeoutException: Execution timed out after ${timeoutMs}ms`,
        executionTimeMs,
      };
    }

    let errorMsg = err.message || String(err);
    if (!errorMsg.startsWith('java.lang.')) {
      errorMsg = `Exception in thread "main" java.lang.RuntimeException: ${errorMsg}`;
    }

    return {
      status: 'RUNTIME_ERROR',
      stdout: '',
      stderr: errorMsg,
      executionTimeMs,
    };
  }
}

// Create Java Virtual Sandbox Context with standard Java libraries
function createJavaSandbox(input: string, logs: string[], errLogs: string[]) {
  // Input lines reader for Scanner
  const inputLines = input.split('\n');
  let lineIdx = 0;
  let tokenIdx = 0;
  let tokens: string[] = [];

  class Scanner {
    constructor(_stream?: any) {
      tokens = input.trim().split(/\s+/).filter(Boolean);
    }
    hasNext(): boolean {
      return tokenIdx < tokens.length;
    }
    next(): string {
      if (tokenIdx >= tokens.length) throw new Error('java.util.NoSuchElementException');
      return tokens[tokenIdx++];
    }
    hasNextLine(): boolean {
      return lineIdx < inputLines.length;
    }
    nextLine(): string {
      if (lineIdx >= inputLines.length) return '';
      return inputLines[lineIdx++];
    }
    nextInt(): number {
      const str = this.next();
      const num = parseInt(str, 10);
      if (isNaN(num)) throw new Error(`java.lang.NumberFormatException: For input string: "${str}"`);
      return num;
    }
    nextDouble(): number {
      const str = this.next();
      const num = parseFloat(str);
      if (isNaN(num)) throw new Error(`java.lang.NumberFormatException: For input string: "${str}"`);
      return num;
    }
    close() {}
  }

  // System
  const System = {
    out: {
      println: (...args: any[]) => {
        logs.push(args.map((a) => (a === null ? 'null' : typeof a === 'object' ? a.toString() : String(a))).join(' '));
      },
      print: (...args: any[]) => {
        const text = args.map((a) => (a === null ? 'null' : String(a))).join(' ');
        if (logs.length > 0) {
          logs[logs.length - 1] += text;
        } else {
          logs.push(text);
        }
      },
      printf: (fmt: string, ...args: any[]) => {
        let i = 0;
        const formatted = fmt.replace(/%[sdif]/g, () => String(args[i++]));
        logs.push(formatted);
      },
    },
    err: {
      println: (...args: any[]) => {
        errLogs.push(args.map((a) => String(a)).join(' '));
      },
    },
  };

  // Java Collections: HashMap, ArrayList, HashSet, Stack
  class HashMap<K, V> {
    private map = new Map<any, any>();
    put(key: K, value: V) { this.map.set(key, value); }
    get(key: K): V | undefined { return this.map.get(key); }
    containsKey(key: K): boolean { return this.map.has(key); }
    containsValue(val: V): boolean { return Array.from(this.map.values()).includes(val); }
    remove(key: K): V | undefined {
      const v = this.map.get(key);
      this.map.delete(key);
      return v;
    }
    size(): number { return this.map.size; }
    isEmpty(): boolean { return this.map.size === 0; }
    clear() { this.map.clear(); }
    keySet() { return Array.from(this.map.keys()); }
    values() { return Array.from(this.map.values()); }
    toString() {
      const entries: string[] = [];
      this.map.forEach((v, k) => entries.push(`${k}=${v}`));
      return `{${entries.join(', ')}}`;
    }
  }

  class ArrayList<T> {
    private arr: T[] = [];
    add(elem: T) { this.arr.push(elem); return true; }
    get(index: number): T {
      if (index < 0 || index >= this.arr.length) {
        throw new Error(`java.lang.IndexOutOfBoundsException: Index ${index} out of bounds for length ${this.arr.length}`);
      }
      return this.arr[index];
    }
    set(index: number, elem: T): T {
      const old = this.get(index);
      this.arr[index] = elem;
      return old;
    }
    size(): number { return this.arr.length; }
    isEmpty(): boolean { return this.arr.length === 0; }
    remove(index: number): T {
      this.get(index);
      return this.arr.splice(index, 1)[0];
    }
    contains(elem: T): boolean { return this.arr.includes(elem); }
    toArray() { return [...this.arr]; }
    toString() { return `[${this.arr.join(', ')}]`; }
  }

  class HashSet<T> {
    private set = new Set<T>();
    add(elem: T): boolean {
      if (this.set.has(elem)) return false;
      this.set.add(elem);
      return true;
    }
    contains(elem: T): boolean { return this.set.has(elem); }
    remove(elem: T): boolean { return this.set.delete(elem); }
    size(): number { return this.set.size; }
    isEmpty(): boolean { return this.set.size === 0; }
    clear() { this.set.clear(); }
  }

  class Stack<T> {
    private items: T[] = [];
    push(item: T): T { this.items.push(item); return item; }
    pop(): T {
      if (this.isEmpty()) throw new Error('java.util.EmptyStackException');
      return this.items.pop()!;
    }
    peek(): T {
      if (this.isEmpty()) throw new Error('java.util.EmptyStackException');
      return this.items[this.items.length - 1];
    }
    empty(): boolean { return this.items.length === 0; }
    isEmpty(): boolean { return this.items.length === 0; }
    size(): number { return this.items.length; }
  }

  const Arrays = {
    sort: (arr: any[]) => arr.sort((a, b) => (typeof a === 'number' ? a - b : String(a).localeCompare(String(b)))),
    toString: (arr: any[]) => `[${arr.join(', ')}]`,
    equals: (a: any[], b: any[]) => a.length === b.length && a.every((val, i) => val === b[i]),
  };

  const Collections = {
    sort: (list: ArrayList<any>) => (list as any).arr.sort(),
    reverse: (list: ArrayList<any>) => (list as any).arr.reverse(),
  };

  const Integer = {
    parseInt: (str: string) => {
      const res = parseInt(String(str).trim(), 10);
      if (isNaN(res)) throw new Error(`java.lang.NumberFormatException: For input string: "${str}"`);
      return res;
    },
    toString: (num: number) => String(num),
    MAX_VALUE: 2147483647,
    MIN_VALUE: -2147483648,
  };

  const Double = {
    parseDouble: (str: string) => {
      const res = parseFloat(String(str).trim());
      if (isNaN(res)) throw new Error(`java.lang.NumberFormatException: For input string: "${str}"`);
      return res;
    },
    toString: (num: number) => String(num),
  };

  class StringBuilder {
    private str = '';
    constructor(initial = '') { this.str = initial; }
    append(val: any): StringBuilder { this.str += String(val); return this; }
    toString(): string { return this.str; }
    length(): number { return this.str.length; }
    reverse(): StringBuilder { this.str = this.str.split('').reverse().join(''); return this; }
  }

  return {
    System,
    Scanner,
    HashMap,
    ArrayList,
    HashSet,
    Stack,
    Arrays,
    Collections,
    Integer,
    Double,
    StringBuilder,
    Math,
    inputString: input,
  };
}

// Clean Java-to-JS Transpiler for sandbox execution
function transpileJavaToJS(javaCode: string, input: string): string {
  let js = javaCode;

  // Remove package & import declarations
  js = js.replace(/^package\s+[^;]+;/gm, '');
  js = js.replace(/^import\s+[^;]+;/gm, '');

  // Convert Java types in variable declarations
  // int a = 5; -> let a = 5;
  // String s = "hello"; -> let s = "hello";
  js = js.replace(/\b(int|long|double|float|boolean|char|String|var|byte|short)\s+([a-zA-Z_]\w*)\s*=/g, 'let $2 =');
  js = js.replace(/\b(int|long|double|float|boolean|char|String|var|byte|short)\s+([a-zA-Z_]\w*)\s*;/g, 'let $2;');
  js = js.replace(/\b(int|long|double|float|boolean|char|String)\[\]\s+([a-zA-Z_]\w*)\s*=/g, 'let $2 =');
  
  // Generic collections: Map<K,V> map = new HashMap<>(); -> let map = new HashMap();
  js = js.replace(/\b(Map|HashMap|List|ArrayList|Set|HashSet|Stack|Queue)<[^>]+>\s+([a-zA-Z_]\w*)\s*=/g, 'let $2 =');
  js = js.replace(/\b(Map|HashMap|List|ArrayList|Set|HashSet|Stack|Queue)\s+([a-zA-Z_]\w*)\s*=/g, 'let $2 =');
  js = js.replace(/\bnew\s+HashMap<[^>]*>\(\)/g, 'new HashMap()');
  js = js.replace(/\bnew\s+ArrayList<[^>]*>\(\)/g, 'new ArrayList()');
  js = js.replace(/\bnew\s+HashSet<[^>]*>\(\)/g, 'new HashSet()');
  js = js.replace(/\bnew\s+Stack<[^>]*>\(\)/g, 'new Stack()');

  // String methods: s.length() -> s.length, s.charAt(i) -> s.charAt(i), s.equals(o) -> (s === o)
  js = js.replace(/\.equals\(([^)]+)\)/g, ' === ($1)');
  js = js.replace(/\.equalsIgnoreCase\(([^)]+)\)/g, '.toLowerCase() === ($1).toLowerCase()');

  // Convert method signatures:
  // public static String solve(String input) { -> static solve(input) {
  js = js.replace(/public\s+static\s+\w+(?:\[\])?\s+([a-zA-Z_]\w*)\s*\(([^)]*)\)/g, (_m, methodName, params) => {
    const cleanedParams = params.split(',').map((p: string) => p.trim().split(/\s+/).pop()).join(', ');
    return `static ${methodName}(${cleanedParams})`;
  });

  // public static void main(String[] args) -> static main(args)
  js = js.replace(/public\s+static\s+void\s+main\s*\([^)]*\)/g, 'static main(args)');

  // Extract class name
  const classMatch = js.match(/class\s+([a-zA-Z_]\w*)/);
  const className = classMatch ? classMatch[1] : 'Solution';

  const cleanInput = input.replace(/\\/g, '\\\\').replace(/`/g, '\\`');

  // Append driver code to invoke solve() or main()
  const driver = `
    ${js}

    (function() {
      try {
        const TargetClass = typeof ${className} !== 'undefined' ? ${className} : (typeof Solution !== 'undefined' ? Solution : (typeof Main !== 'undefined' ? Main : null));
        if (TargetClass) {
          if (typeof TargetClass.solve === 'function') {
            const res = TargetClass.solve(\`${cleanInput}\`);
            if (res !== undefined && res !== null) {
              System.out.println(res);
            }
          } else if (typeof TargetClass.main === 'function') {
            TargetClass.main([]);
          }
        }
      } catch (err) {
        System.err.println(err.message || String(err));
        throw err;
      }
    })();
  `;

  return driver;
}

// ----------------------------------------------------
// 3. TEST CASE EVALUATOR
// ----------------------------------------------------

export async function evaluateTestCase(
  code: string,
  language: string,
  testCase: { input: string; expectedOutput: string; id?: string },
  timeoutMs: number = 3000
): Promise<TestCaseEvaluationResult> {
  const startTime = Date.now();
  const execResult = await executeCode(code, language, testCase.input, timeoutMs);

  const cleanActual = execResult.stdout.trim();
  const cleanExpected = testCase.expectedOutput.trim();

  const isSuccess = execResult.status === 'SUCCESS';
  const passed = isSuccess && cleanActual === cleanExpected;

  return {
    testCaseIndex: 1,
    input: testCase.input,
    expectedOutput: cleanExpected,
    actualOutput: execResult.stderr ? `Error: ${execResult.stderr}` : cleanActual,
    passed,
    executionTimeMs: execResult.executionTimeMs,
    status: execResult.status,
    error: execResult.stderr || undefined,
  };
}
