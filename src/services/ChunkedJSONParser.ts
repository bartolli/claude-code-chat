import { Logger } from '../core/Logger';

/**
 * Result of parsing a JSON value from a string
 */
export interface JSONParseResult<T = any> {
  /** The parsed JSON value */
  value: T;
  /** Any remaining unparsed string content */
  remainder: string;
  /** Number of bytes consumed from the input during parsing */
  bytesConsumed: number;
}

/**
 * Configuration options for the JSON parser
 */
export interface ParserOptions {
  /** Maximum nesting depth allowed for objects and arrays */
  maxDepth?: number;
  /** Maximum buffer size in bytes to prevent memory exhaustion */
  maxBufferSize?: number;
  /** Whether to throw on invalid JSON or attempt recovery */
  strict?: boolean;
}

export type JSONValue = string | number | boolean | null | JSONObject | JSONArray;
export interface JSONObject {
  [key: string]: JSONValue;
}
export interface JSONArray extends Array<JSONValue> {}

/**
 * Parser for handling JSON data from streaming sources with support for incomplete chunks
 */
export class ChunkedJSONParser {
  private readonly logger: Logger;
  private readonly defaultOptions: Required<ParserOptions> = {
    maxDepth: 100,
    maxBufferSize: 10 * 1024 * 1024, // 10MB
    strict: false,
  };

  /**
   * Creates a new ChunkedJSONParser instance for parsing JSON from streaming data
   * @param logger - Logger instance for error reporting
   */
  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Parse potentially incomplete JSON from a stream chunk
   * @param chunk - New chunk of data to parse
   * @param buffer - Previously buffered incomplete data
   * @param options - Optional parser configuration
   * @returns Object containing parsed values and any remaining unparsed data
   */
  parseChunk<T = any>(
    chunk: string,
    buffer: string = '',
    options?: ParserOptions
  ): {
    /** Array of successfully parsed JSON values from the chunk */
    parsed: T[];
    /** Any remaining unparsed content to be buffered for the next chunk */
    remainder: string;
  } {
    const opts = { ...this.defaultOptions, ...options };
    let current = buffer + chunk;
    const parsed: T[] = [];

    // Check buffer size
    if (current.length > opts.maxBufferSize) {
      this.logger.error('ChunkedJSONParser', 'JSON buffer exceeded maximum size', undefined, {
        size: current.length,
        maxSize: opts.maxBufferSize,
      });
      throw new Error('JSON buffer overflow');
    }

    while (current.length > 0) {
      try {
        const result = this.parseValue(current, 0, opts);
        if (result) {
          parsed.push(result.value as T);
          current = current.substring(result.bytesConsumed).trim();
        } else {
          // No complete JSON found, keep remainder
          break;
        }
      } catch (error) {
        if (this.isIncompleteError(error)) {
          // Expected - incomplete JSON
          break;
        } else if (opts.strict) {
          throw error;
        } else {
          // Skip invalid JSON and try next
          const nextStart = this.findNextPotentialJSON(current);
          if (nextStart === -1) {
            break;
          }
          current = current.substring(nextStart);
        }
      }
    }

    return { parsed, remainder: current };
  }

  /**
   * Parse a complete JSON value from string
   * @param input - The input string to parse
   * @param start - Starting position in the string
   * @param options - Parser configuration options
   * @param depth - Current parsing depth for recursion tracking
   * @returns Parsed result or null if no complete value found
   */
  private parseValue(
    input: string,
    start: number,
    options: Required<ParserOptions>,
    depth: number = 0
  ): JSONParseResult | null {
    if (depth > options.maxDepth) {
      throw new Error('Maximum parse depth exceeded');
    }

    const trimmed = this.skipWhitespace(input, start);
    if (trimmed >= input.length) {
      return null;
    }

    const char = input[trimmed];

    switch (char) {
      case '{':
        return this.parseObject(input, trimmed, options, depth + 1);
      case '[':
        return this.parseArray(input, trimmed, options, depth + 1);
      case '"':
        return this.parseString(input, trimmed);
      case 't':
      case 'f':
        return this.parseBoolean(input, trimmed);
      case 'n':
        return this.parseNull(input, trimmed);
      case '-':
      case '0':
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        return this.parseNumber(input, trimmed);
      default:
        throw new Error(`Unexpected character '${char}' at position ${trimmed}`);
    }
  }

  /**
   * Parse JSON object
   * @param input - The input string containing the object
   * @param start - Starting position of the object (at '{')
   * @param options - Parser configuration options
   * @param depth - Current parsing depth for recursion tracking
   * @returns Parsed object result
   * @throws Error if object is incomplete or malformed
   */
  private parseObject(
    input: string,
    start: number,
    options: Required<ParserOptions>,
    depth: number
  ): JSONParseResult<JSONObject> {
    const obj: JSONObject = {};
    let pos = start + 1; // Skip '{'

    pos = this.skipWhitespace(input, pos);

    // Empty object
    if (pos < input.length && input[pos] === '}') {
      return { value: obj, remainder: '', bytesConsumed: pos + 1 - start };
    }

    while (pos < input.length) {
      // Parse key
      pos = this.skipWhitespace(input, pos);
      if (pos >= input.length) {
        throw new Error('Incomplete object - missing key');
      }

      if (input[pos] !== '"') {
        throw new Error(`Expected string key at position ${pos}`);
      }

      const keyResult = this.parseString(input, pos);
      const key = keyResult.value;
      pos += keyResult.bytesConsumed;

      // Parse colon
      pos = this.skipWhitespace(input, pos);
      if (pos >= input.length || input[pos] !== ':') {
        throw new Error('Incomplete object - missing colon');
      }
      pos++;

      // Parse value
      pos = this.skipWhitespace(input, pos);
      const valueResult = this.parseValue(input, pos, options, depth);
      if (!valueResult) {
        throw new Error('Incomplete object - missing value');
      }

      obj[key] = valueResult.value;
      pos += valueResult.bytesConsumed;

      // Check for comma or closing brace
      pos = this.skipWhitespace(input, pos);
      if (pos >= input.length) {
        throw new Error('Incomplete object - missing closing brace');
      }

      if (input[pos] === '}') {
        return { value: obj, remainder: '', bytesConsumed: pos + 1 - start };
      } else if (input[pos] === ',') {
        pos++;
      } else {
        throw new Error(`Expected ',' or '}' at position ${pos}`);
      }
    }

    throw new Error('Incomplete object');
  }

  /**
   * Parse JSON array
   * @param input - The input string containing the array
   * @param start - Starting position of the array (at '[')
   * @param options - Parser configuration options
   * @param depth - Current parsing depth for recursion tracking
   * @returns Parsed array result
   * @throws Error if array is incomplete or malformed
   */
  private parseArray(
    input: string,
    start: number,
    options: Required<ParserOptions>,
    depth: number
  ): JSONParseResult<JSONArray> {
    const arr: JSONArray = [];
    let pos = start + 1; // Skip '['

    pos = this.skipWhitespace(input, pos);

    // Empty array
    if (pos < input.length && input[pos] === ']') {
      return { value: arr, remainder: '', bytesConsumed: pos + 1 - start };
    }

    while (pos < input.length) {
      // Parse value
      const valueResult = this.parseValue(input, pos, options, depth);
      if (!valueResult) {
        throw new Error('Incomplete array - missing value');
      }

      arr.push(valueResult.value);
      pos += valueResult.bytesConsumed;

      // Check for comma or closing bracket
      pos = this.skipWhitespace(input, pos);
      if (pos >= input.length) {
        throw new Error('Incomplete array - missing closing bracket');
      }

      if (input[pos] === ']') {
        return { value: arr, remainder: '', bytesConsumed: pos + 1 - start };
      } else if (input[pos] === ',') {
        pos++;
        pos = this.skipWhitespace(input, pos);
      } else {
        throw new Error(`Expected ',' or ']' at position ${pos}`);
      }
    }

    throw new Error('Incomplete array');
  }

  /**
   * Parse JSON string
   * @param input - The input string containing the JSON string
   * @param start - Starting position of the string (at opening quote)
   * @returns Parsed string result
   * @throws Error if string is incomplete or contains invalid escape sequences
   */
  private parseString(input: string, start: number): JSONParseResult<string> {
    let pos = start + 1; // Skip opening quote
    let value = '';
    let escaped = false;

    while (pos < input.length) {
      const char = input[pos];

      if (escaped) {
        switch (char) {
          case '"':
          case '\\':
          case '/':
            value += char;
            break;
          case 'b':
            value += '\b';
            break;
          case 'f':
            value += '\f';
            break;
          case 'n':
            value += '\n';
            break;
          case 'r':
            value += '\r';
            break;
          case 't':
            value += '\t';
            break;
          case 'u':
            // Unicode escape
            if (pos + 4 >= input.length) {
              throw new Error('Incomplete unicode escape');
            }
            const hex = input.substring(pos + 1, pos + 5);
            value += String.fromCharCode(parseInt(hex, 16));
            pos += 4;
            break;
          default:
            throw new Error(`Invalid escape sequence '\\${char}'`);
        }
        escaped = false;
      } else {
        if (char === '\\') {
          escaped = true;
        } else if (char === '"') {
          return { value, remainder: '', bytesConsumed: pos + 1 - start };
        } else {
          value += char;
        }
      }
      pos++;
    }

    throw new Error('Incomplete string');
  }

  /**
   * Parse JSON number
   * @param input - The input string containing the number
   * @param start - Starting position of the number
   * @returns Parsed number result
   * @throws Error if number format is invalid or incomplete
   */
  private parseNumber(input: string, start: number): JSONParseResult<number> {
    let pos = start;
    let numStr = '';

    // Optional minus
    if (input[pos] === '-') {
      numStr += '-';
      pos++;
    }

    // Integer part
    if (pos >= input.length) {
      throw new Error('Incomplete number');
    }

    if (input[pos] === '0') {
      numStr += '0';
      pos++;
    } else {
      while (pos < input.length && /[0-9]/.test(input[pos])) {
        numStr += input[pos];
        pos++;
      }
    }

    // Fractional part
    if (pos < input.length && input[pos] === '.') {
      numStr += '.';
      pos++;

      if (pos >= input.length || !/[0-9]/.test(input[pos])) {
        throw new Error('Incomplete number - missing fractional part');
      }

      while (pos < input.length && /[0-9]/.test(input[pos])) {
        numStr += input[pos];
        pos++;
      }
    }

    // Exponent part
    if (pos < input.length && /[eE]/.test(input[pos])) {
      numStr += input[pos];
      pos++;

      if (pos < input.length && /[+-]/.test(input[pos])) {
        numStr += input[pos];
        pos++;
      }

      if (pos >= input.length || !/[0-9]/.test(input[pos])) {
        throw new Error('Incomplete number - missing exponent');
      }

      while (pos < input.length && /[0-9]/.test(input[pos])) {
        numStr += input[pos];
        pos++;
      }
    }

    const value = parseFloat(numStr);
    if (isNaN(value)) {
      throw new Error(`Invalid number '${numStr}'`);
    }

    return { value, remainder: '', bytesConsumed: pos - start };
  }

  /**
   * Parse JSON boolean
   * @param input - The input string containing the boolean
   * @param start - Starting position of the boolean
   * @returns Parsed boolean result (true or false)
   * @throws Error if not a valid boolean literal
   */
  private parseBoolean(input: string, start: number): JSONParseResult<boolean> {
    if (input.substring(start).startsWith('true')) {
      return { value: true, remainder: '', bytesConsumed: 4 };
    } else if (input.substring(start).startsWith('false')) {
      return { value: false, remainder: '', bytesConsumed: 5 };
    } else {
      throw new Error(`Invalid boolean at position ${start}`);
    }
  }

  /**
   * Parse JSON null
   * @param input - The input string containing null
   * @param start - Starting position of null
   * @returns Parsed null result
   * @throws Error if not a valid null literal
   */
  private parseNull(input: string, start: number): JSONParseResult<null> {
    if (input.substring(start).startsWith('null')) {
      return { value: null, remainder: '', bytesConsumed: 4 };
    } else {
      throw new Error(`Invalid null at position ${start}`);
    }
  }

  /**
   * Skip whitespace characters
   * @param input - The input string to scan
   * @param start - Starting position to begin skipping
   * @returns Position of first non-whitespace character
   */
  private skipWhitespace(input: string, start: number): number {
    let pos = start;
    while (pos < input.length && /\s/.test(input[pos])) {
      pos++;
    }
    return pos;
  }

  /**
   * Check if error is due to incomplete JSON
   * @param error - The error to check
   * @returns True if error indicates incomplete JSON that might be completed with more data
   */
  private isIncompleteError(error: any): boolean {
    const message = error?.message || '';
    return (
      message.includes('Incomplete') || message.includes('missing') || message.includes('Missing')
    );
  }

  /**
   * Find next potential JSON start
   * @param input - The input string to search
   * @returns Index of the next character that could start a JSON value, or -1 if none found
   */
  private findNextPotentialJSON(input: string): number {
    const starts = [
      '{',
      '[',
      '"',
      't',
      'f',
      'n',
      '-',
      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
    ];

    let minIndex = -1;
    for (const start of starts) {
      const index = input.indexOf(start);
      if (index !== -1 && (minIndex === -1 || index < minIndex)) {
        minIndex = index;
      }
    }

    return minIndex;
  }
}
