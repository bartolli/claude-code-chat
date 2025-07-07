/**
 * Result type for functional error handling
 */

export type Result<T, E = Error> = Ok<T> | Err<E>;

export interface Ok<T> {
  /**
   *
   */
  ok: true;
  /**
   *
   */
  value: T;
}

export interface Err<E> {
  /**
   *
   */
  ok: false;
  /**
   *
   */
  error: E;
}

/**
 *
 * @param value
 */
export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

/**
 *
 * @param error
 */
export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

/**
 *
 * @param result
 */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok === true;
}

/**
 *
 * @param result
 */
export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return result.ok === false;
}

/**
 *
 * @param result
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (isOk(result)) {
    return result.value;
  }
  throw result.error;
}

/**
 *
 * @param result
 * @param defaultValue
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  return isOk(result) ? result.value : defaultValue;
}

/**
 *
 * @param result
 * @param fn
 */
export function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return isOk(result) ? ok(fn(result.value)) : result;
}

/**
 *
 * @param result
 * @param fn
 */
export function mapErr<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
  return isErr(result) ? err(fn(result.error)) : result;
}

/**
 *
 * @param result
 * @param fn
 */
export function flatMap<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> {
  return isOk(result) ? fn(result.value) : result;
}

/**
 *
 * @param promise
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
 *
 * @param results
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
 *
 */
export class ResultChain<T, E> {
  /**
   *
   * @param result
   */
  constructor(private result: Result<T, E>) {}

  /**
   *
   * @param result
   */
  static of<T, E>(result: Result<T, E>): ResultChain<T, E> {
    return new ResultChain(result);
  }

  /**
   *
   * @param fn
   */
  map<U>(fn: (value: T) => U): ResultChain<U, E> {
    return new ResultChain(map(this.result, fn));
  }

  /**
   *
   * @param fn
   */
  mapErr<F>(fn: (error: E) => F): ResultChain<T, F> {
    return new ResultChain(mapErr(this.result, fn));
  }

  /**
   *
   * @param fn
   */
  flatMap<U>(fn: (value: T) => Result<U, E>): ResultChain<U, E> {
    return new ResultChain(flatMap(this.result, fn));
  }

  /**
   *
   */
  unwrap(): T {
    return unwrap(this.result);
  }

  /**
   *
   * @param defaultValue
   */
  unwrapOr(defaultValue: T): T {
    return unwrapOr(this.result, defaultValue);
  }

  /**
   *
   */
  get(): Result<T, E> {
    return this.result;
  }
}
