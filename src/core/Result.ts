/**
 * Result type for functional error handling
 */

export type Result<T, E = Error> = Ok<T> | Err<E>;

export interface Ok<T> {
  /**
   * Discriminator property indicating success
   */
  ok: true;
  /**
   * The successful result value
   */
  value: T;
}

export interface Err<E> {
  /**
   * Discriminator property indicating failure
   */
  ok: false;
  /**
   * The error that occurred
   */
  error: E;
}

/**
 * Creates a successful Result
 * @param value - The success value to wrap
 * @returns A successful Result containing the value
 */
export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

/**
 * Creates a failed Result
 * @param error - The error to wrap
 * @returns A failed Result containing the error
 */
export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

/**
 * Type guard to check if a Result is successful
 * @param result - The Result to check
 * @returns True if the Result is Ok, false otherwise
 */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok === true;
}

/**
 * Type guard to check if a Result is a failure
 * @param result - The Result to check
 * @returns True if the Result is Err, false otherwise
 */
export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return result.ok === false;
}

/**
 * Unwraps a Result, throwing if it's an error
 * @param result - The Result to unwrap
 * @returns The success value
 * @throws The error if Result is Err
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (isOk(result)) {
    return result.value;
  }
  throw result.error;
}

/**
 * Unwraps a Result with a default value for errors
 * @param result - The Result to unwrap
 * @param defaultValue - Value to return if Result is Err
 * @returns The success value or default
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  return isOk(result) ? result.value : defaultValue;
}

/**
 * Maps a Result's success value using a function
 * @param result - The Result to map
 * @param fn - Function to apply to the success value
 * @returns A new Result with the mapped value or original error
 */
export function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return isOk(result) ? ok(fn(result.value)) : result;
}

/**
 * Maps a Result's error value using a function
 * @param result - The Result to map
 * @param fn - Function to apply to the error value
 * @returns A new Result with original value or mapped error
 */
export function mapErr<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
  return isErr(result) ? err(fn(result.error)) : result;
}

/**
 * Chains Result-returning operations
 * @param result - The Result to chain from
 * @param fn - Function that returns a new Result
 * @returns The Result from fn or original error
 */
export function flatMap<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> {
  return isOk(result) ? fn(result.value) : result;
}

/**
 * Converts a Promise to a Result
 * @param promise - The Promise to convert
 * @returns A Promise of Result containing the value or error
 */
export async function fromPromise<T>(promise: Promise<T>): Promise<Result<T, Error>> {
  try {
    const value = await promise;
    return ok(value);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Collects an array of Results into a Result of array
 * @param results - Array of Results to collect
 * @returns Ok with all values or first Err encountered
 */
export function collect<T, E>(results: Result<T, E>[]): Result<T[], E> {
  const values: T[] = [];

  for (const result of results) {
    if (isErr(result)) {
      return result;
    }
    values.push(result.value);
  }

  return ok(values);
}

// Helper class for chaining operations
/**
 * Chainable wrapper for Result operations
 */
export class ResultChain<T, E> {
  /**
   * Creates a new ResultChain
   * @param result - The Result to wrap
   */
  constructor(private result: Result<T, E>) {}

  /**
   * Creates a ResultChain from a Result
   * @param result - The Result to wrap
   * @returns A new ResultChain
   */
  static of<T, E>(result: Result<T, E>): ResultChain<T, E> {
    return new ResultChain(result);
  }

  /**
   * Maps the success value in the chain
   * @param fn - Function to apply to the success value
   * @returns A new ResultChain with mapped value
   */
  map<U>(fn: (value: T) => U): ResultChain<U, E> {
    return new ResultChain(map(this.result, fn));
  }

  /**
   * Maps the error value in the chain
   * @param fn - Function to apply to the error value
   * @returns A new ResultChain with mapped error
   */
  mapErr<F>(fn: (error: E) => F): ResultChain<T, F> {
    return new ResultChain(mapErr(this.result, fn));
  }

  /**
   * Chains a Result-returning operation
   * @param fn - Function that returns a new Result
   * @returns A new ResultChain with the result
   */
  flatMap<U>(fn: (value: T) => Result<U, E>): ResultChain<U, E> {
    return new ResultChain(flatMap(this.result, fn));
  }

  /**
   * Unwraps the Result, throwing if it's an error
   * @returns The success value
   * @throws The error if Result is Err
   */
  unwrap(): T {
    return unwrap(this.result);
  }

  /**
   * Unwraps the Result with a default for errors
   * @param defaultValue - Value to return if Result is Err
   * @returns The success value or default
   */
  unwrapOr(defaultValue: T): T {
    return unwrapOr(this.result, defaultValue);
  }

  /**
   * Gets the underlying Result
   * @returns The wrapped Result
   */
  get(): Result<T, E> {
    return this.result;
  }
}
