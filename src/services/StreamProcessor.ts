import { Readable } from 'stream';
import { ClaudeStreamMessage } from '../types/claude';
import { Logger } from '../core/Logger';

/**
 * Configuration options for stream processing
 */
export interface StreamProcessorOptions {
  /** Size of the internal buffer for processing chunks */
  bufferSize?: number;
  /** Maximum allowed buffer size before throwing an error */
  maxBufferSize?: number;
  /** Processing mode: 'line' for line-by-line, 'chunk' for raw chunks */
  parseMode?: 'line' | 'chunk';
}

/**
 * Represents a processed chunk of stream data
 */
export interface StreamChunk<T = any> {
  /** Parsed data from the chunk */
  data: T;
  /** Raw string representation of the chunk */
  raw: string;
  /** Unix timestamp when the chunk was processed */
  timestamp: number;
  /** Whether this chunk represents a complete unit of data */
  isComplete: boolean;
}

/**
 * Processes various types of streams with support for buffering, rate limiting, and transformation
 */
export class StreamProcessor {
  private readonly logger: Logger;
  private readonly defaultOptions: Required<StreamProcessorOptions> = {
    bufferSize: 1024,
    maxBufferSize: 1024 * 1024, // 1MB
    parseMode: 'line',
  };

  /**
   * Creates a new StreamProcessor instance
   * @param logger - Logger instance for debugging and error reporting
   */
  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Process a Node.js readable stream as an AsyncGenerator
   * @param stream - The readable stream to process
   * @param options - Optional configuration for stream processing
   * @yields Stream chunks containing processed data
   */
  async *processStream<T = any>(
    stream: Readable,
    options?: StreamProcessorOptions
  ): AsyncGenerator<StreamChunk<T>, void, unknown> {
    const opts = { ...this.defaultOptions, ...options };
    let buffer = '';

    try {
      for await (const chunk of stream) {
        buffer += chunk.toString();

        // Check buffer size limit
        if (buffer.length > opts.maxBufferSize) {
          this.logger.error('StreamProcessor', 'Stream buffer exceeded maximum size', undefined, {
            bufferSize: buffer.length,
            maxSize: opts.maxBufferSize,
          });
          throw new Error('Stream buffer overflow');
        }

        // Process based on mode
        if (opts.parseMode === 'line') {
          const lines = buffer.split('\n');
          // Process all complete lines (all but the last)
          for (let i = 0; i < lines.length - 1; i++) {
            if (lines[i].trim() || lines[i] === '') {
              yield {
                data: lines[i] as unknown as T,
                raw: lines[i],
                timestamp: Date.now(),
                isComplete: true,
              };
            }
          }
          // Keep the last line (incomplete) in buffer
          buffer = lines[lines.length - 1];
        } else {
          yield* this.processChunkMode<T>(chunk.toString());
        }
      }

      // Process any remaining data
      if (buffer.trim()) {
        yield {
          data: buffer as unknown as T,
          raw: buffer,
          timestamp: Date.now(),
          isComplete: true,
        };
      }
    } catch (error) {
      this.logger.error('StreamProcessor', 'Stream processing error', error as Error);
      throw error;
    }
  }

  /**
   * Process Claude's JSON stream format
   * @param stream - The readable stream containing Claude messages
   * @yields Stream chunks containing parsed Claude messages
   */
  async *processClaudeStream(
    stream: Readable
  ): AsyncGenerator<StreamChunk<ClaudeStreamMessage>, void, unknown> {
    let buffer = '';
    let messageBuffer = '';
    let inMessage = false;

    // Debug log
    this.logger.info('StreamProcessor', 'Starting to process Claude stream');
    this.logger.debug('StreamProcessor', 'Stream state', {
      readable: stream.readable,
      readableFlowing: stream.readableFlowing,
      readableLength: stream.readableLength,
    });

    // Ensure stream is in flowing mode if needed
    if (stream.readableFlowing === null) {
      stream.resume();
    }

    // Handle both async iterable streams and older streams
    const chunks = stream[Symbol.asyncIterator]
      ? stream
      : this.createAsyncIterableFromStream(stream);

    for await (const chunk of chunks) {
      const chunkStr = chunk.toString();
      this.logger.debug('StreamProcessor', 'Processing chunk', {
        size: chunk.length,
        preview: chunkStr.substring(0, 100),
      });

      buffer += chunkStr;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed) {
          continue;
        }

        // Handle multi-line messages
        if (trimmed.includes('"type":"assistant_message"') && trimmed.includes('"content":"')) {
          inMessage = true;
          messageBuffer = '';
        }

        if (inMessage) {
          messageBuffer += line + '\n';

          // Check if message is complete
          try {
            const parsed = JSON.parse(messageBuffer);
            yield {
              data: parsed as ClaudeStreamMessage,
              raw: messageBuffer,
              timestamp: Date.now(),
              isComplete: true,
            };
            inMessage = false;
            messageBuffer = '';
          } catch {
            // Message not complete yet, continue buffering
          }
        } else {
          // Single line JSON
          try {
            this.logger.debug('StreamProcessor', 'Attempting to parse JSON line', {
              line: trimmed,
            });
            const parsed = JSON.parse(trimmed);
            this.logger.info('StreamProcessor', 'Successfully parsed JSON', { type: parsed.type });
            yield {
              data: parsed as ClaudeStreamMessage,
              raw: trimmed,
              timestamp: Date.now(),
              isComplete: true,
            };
          } catch (error) {
            this.logger.warn('StreamProcessor', 'Failed to parse JSON line', {
              line: trimmed,
              error,
            });
          }
        }
      }
    }

    // Process remaining buffer
    if (buffer.trim() || messageBuffer.trim()) {
      const remaining = messageBuffer || buffer;
      try {
        const parsed = JSON.parse(remaining.trim());
        yield {
          data: parsed as ClaudeStreamMessage,
          raw: remaining,
          timestamp: Date.now(),
          isComplete: true,
        };
      } catch (error) {
        this.logger.warn('StreamProcessor', 'Failed to parse remaining buffer', {
          buffer: remaining,
          error,
        });
      }
    }
  }

  /**
   * Create an async iterable from a readable stream for older Node versions
   * @param stream - The readable stream to convert
   * @yields Buffer chunks from the stream
   */
  private async *createAsyncIterableFromStream(stream: Readable): AsyncGenerator<Buffer> {
    const chunks: Buffer[] = [];
    let resolveChunk: ((value: Buffer | null) => void) | null = null;
    let rejectChunk: ((error: Error) => void) | null = null;

    stream.on('data', (chunk: Buffer) => {
      this.logger.debug('StreamProcessor', 'Received data chunk', { size: chunk.length });
      if (resolveChunk) {
        resolveChunk(chunk);
        resolveChunk = null;
        rejectChunk = null;
      } else {
        chunks.push(chunk);
      }
    });

    stream.on('end', () => {
      this.logger.debug('StreamProcessor', 'Stream ended');
      if (resolveChunk) {
        resolveChunk(null);
        resolveChunk = null;
        rejectChunk = null;
      }
    });

    stream.on('error', (error) => {
      this.logger.error('StreamProcessor', 'Stream error', error);
      if (rejectChunk) {
        rejectChunk(error);
        resolveChunk = null;
        rejectChunk = null;
      }
    });

    while (true) {
      if (chunks.length > 0) {
        yield chunks.shift()!;
      } else {
        const chunk = await new Promise<Buffer | null>((resolve, reject) => {
          resolveChunk = resolve;
          rejectChunk = reject;
        });

        if (chunk === null) {
          break; // Stream ended
        }
        yield chunk;
      }
    }
  }

  /**
   * Transform stream chunks with backpressure support
   * @param generator - The source async generator producing chunks
   * @param transformer - Function to transform each chunk's data
   * @yields Transformed stream chunks
   */
  async *transformStream<T, R>(
    generator: AsyncGenerator<StreamChunk<T>>,
    transformer: (chunk: StreamChunk<T>) => R | Promise<R>
  ): AsyncGenerator<StreamChunk<R>, void, unknown> {
    for await (const chunk of generator) {
      try {
        const transformed = await transformer(chunk);
        yield {
          ...chunk,
          data: transformed,
        };
      } catch (error) {
        this.logger.error('StreamProcessor', 'Transform error', error as Error, { chunk });
        throw error;
      }
    }
  }

  /**
   * Batch stream chunks for efficiency
   * @param generator - The source async generator producing chunks
   * @param batchSize - Maximum number of chunks per batch (default: 10)
   * @param flushInterval - Maximum time in ms before flushing a batch (default: 100)
   * @yields Batched stream chunks containing arrays of data
   */
  async *batchStream<T>(
    generator: AsyncGenerator<StreamChunk<T>>,
    batchSize: number = 10,
    flushInterval: number = 100
  ): AsyncGenerator<StreamChunk<T[]>, void, unknown> {
    let batch: StreamChunk<T>[] = [];
    let lastFlush = Date.now();

    for await (const chunk of generator) {
      batch.push(chunk);

      const shouldFlush = batch.length >= batchSize || Date.now() - lastFlush > flushInterval;

      if (shouldFlush) {
        yield {
          data: batch.map((c) => c.data),
          raw: batch.map((c) => c.raw).join(''),
          timestamp: Date.now(),
          isComplete: true,
        };
        batch = [];
        lastFlush = Date.now();
      }
    }

    // Flush remaining
    if (batch.length > 0) {
      yield {
        data: batch.map((c) => c.data),
        raw: batch.map((c) => c.raw).join(''),
        timestamp: Date.now(),
        isComplete: true,
      };
    }
  }

  /**
   * Rate limit stream processing
   * @param generator - The source async generator producing chunks
   * @param itemsPerSecond - Maximum number of items to emit per second
   * @yields Rate-limited stream chunks
   */
  async *rateLimitStream<T>(
    generator: AsyncGenerator<StreamChunk<T>>,
    itemsPerSecond: number
  ): AsyncGenerator<StreamChunk<T>, void, unknown> {
    const interval = 1000 / itemsPerSecond;
    let lastEmit = 0;

    for await (const chunk of generator) {
      const now = Date.now();
      const elapsed = now - lastEmit;

      if (elapsed < interval) {
        await this.delay(interval - elapsed);
      }

      yield chunk;
      lastEmit = Date.now();
    }
  }

  /**
   * Process data in chunk mode without splitting
   * @param data - The string data to process as a single chunk
   * @yields A single stream chunk containing the data
   */
  private async *processChunkMode<T>(data: string): AsyncGenerator<StreamChunk<T>> {
    yield {
      data: data as unknown as T,
      raw: data,
      timestamp: Date.now(),
      isComplete: false,
    };
  }

  /**
   * Create a promise that resolves after a specified delay
   * @param ms - Delay duration in milliseconds
   * @returns Promise that resolves after the delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
