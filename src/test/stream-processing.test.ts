import * as assert from 'assert';
import { Readable } from 'stream';
import { StreamProcessor, StreamChunk } from '../services/StreamProcessor';
import { ChunkedJSONParser } from '../services/ChunkedJSONParser';
import { ProgressiveUIUpdater } from '../services/ProgressiveUIUpdater';
import { Logger } from '../core/Logger';
import { ClaudeStreamMessage } from '../types/claude';

// Mock logger
/**
 *
 */
class MockLogger implements Partial<Logger> {
  /**
   *
   * @param _category
   * @param _message
   * @param _data
   */
  debug(_category: string, _message: string, _data?: unknown): void {}
  /**
   *
   * @param _category
   * @param _message
   * @param _data
   */
  info(_category: string, _message: string, _data?: unknown): void {}
  /**
   *
   * @param _category
   * @param _message
   * @param _data
   */
  warn(_category: string, _message: string, _data?: unknown): void {}
  /**
   *
   * @param _category
   * @param _message
   * @param _error
   * @param _data
   */
  error(_category: string, _message: string, _error?: Error, _data?: unknown): void {}
}

suite('Stream Processing Tests', () => {
  let streamProcessor: StreamProcessor;
  let jsonParser: ChunkedJSONParser;
  let mockLogger: MockLogger;

  setup(() => {
    mockLogger = new MockLogger();
    streamProcessor = new StreamProcessor(mockLogger as Logger);
    jsonParser = new ChunkedJSONParser(mockLogger as Logger);
  });

  suite('StreamProcessor', () => {
    test('should process line-based stream', async () => {
      const input = 'line1\nline2\nline3\n';
      const stream = Readable.from([input]);

      const chunks: StreamChunk<string>[] = [];
      for await (const chunk of streamProcessor.processStream(stream)) {
        chunks.push(chunk);
      }

      assert.strictEqual(chunks.length, 3);
      assert.strictEqual(chunks[0].data, 'line1');
      assert.strictEqual(chunks[1].data, 'line2');
      assert.strictEqual(chunks[2].data, 'line3');
    });

    test('should handle incomplete lines', async () => {
      const chunks = ['line1\nli', 'ne2\nline3'];
      const stream = Readable.from(chunks);

      const results: StreamChunk<string>[] = [];
      for await (const chunk of streamProcessor.processStream(stream)) {
        results.push(chunk);
      }

      // The stream processor correctly handles incomplete lines across chunks
      assert.strictEqual(results.length, 3);
      assert.strictEqual(results[0].data, 'line1');
      assert.strictEqual(results[1].data, 'line2');
      assert.strictEqual(results[2].data, 'line3');
    });

    test('should process Claude JSON stream - simple message', async () => {
      const jsonLines = [
        '{"type":"system","subtype":"init","message":"Claude initialized"}\n',
        '{"type":"assistant","message":{"content":[{"type":"text","text":"Hello, how can I help you?"}]}}\n',
        '{"type":"result","subtype":"success","session_id":"123","total_cost_usd":0.001}\n',
      ];
      const stream = Readable.from(jsonLines);

      const messages: ClaudeStreamMessage[] = [];
      for await (const chunk of streamProcessor.processClaudeStream(stream)) {
        messages.push(chunk.data);
      }

      assert.strictEqual(messages.length, 3);
      assert.strictEqual(messages[0].type, 'system');
      assert.strictEqual(messages[1].type, 'assistant');
      assert.strictEqual(messages[2].type, 'result');
    });

    test('should handle Claude stream with tool usage', async () => {
      const jsonLines = [
        '{"type":"assistant","message":{"content":[{"type":"text","text":"Let me search for that."}]}}\n',
        '{"type":"assistant","message":{"content":[{"type":"tool_use","name":"WebSearch","input":{"query":"TypeScript streaming"},"id":"tool_123"}]}}\n',
        '{"type":"user","message":{"content":[{"type":"tool_result","content":"Found 5 results...","tool_use_id":"tool_123"}]}}\n',
        '{"type":"assistant","message":{"content":[{"type":"text","text":"Based on the search results..."}]}}\n',
      ];
      const stream = Readable.from(jsonLines);

      const messages: ClaudeStreamMessage[] = [];
      for await (const chunk of streamProcessor.processClaudeStream(stream)) {
        messages.push(chunk.data);
      }

      assert.strictEqual(messages.length, 4);

      // Check tool use
      const toolUseMsg = messages[1] as any;
      assert.strictEqual(toolUseMsg.message.content[0].type, 'tool_use');
      assert.strictEqual(toolUseMsg.message.content[0].name, 'WebSearch');

      // Check tool result
      const toolResultMsg = messages[2] as any;
      assert.strictEqual(toolResultMsg.message.content[0].type, 'tool_result');
      assert.strictEqual(toolResultMsg.message.content[0].content, 'Found 5 results...');
    });

    test('should handle multi-chunk messages', async () => {
      // Simulate a message split across chunks
      const chunks = [
        '{"type":"assistant","message":{"content":[{"type":"text",',
        '"text":"This is a longer message that might be split across multiple chunks in a real stream."}]',
        ',"usage":{"input_tokens":10,"output_tokens":20}}}\n',
      ];
      const stream = Readable.from(chunks);

      const messages: ClaudeStreamMessage[] = [];
      for await (const chunk of streamProcessor.processClaudeStream(stream)) {
        messages.push(chunk.data);
      }

      assert.strictEqual(messages.length, 1);
      const msg = messages[0] as any;
      assert.strictEqual(msg.type, 'assistant');
      assert.strictEqual(
        msg.message.content[0].text,
        'This is a longer message that might be split across multiple chunks in a real stream.'
      );
      assert.strictEqual(msg.message.usage.input_tokens, 10);
    });
  });

  suite('ChunkedJSONParser', () => {
    test('should parse complete JSON objects', () => {
      const input = '{"type":"test","value":123}{"type":"test2","value":456}';
      const result = jsonParser.parseChunk(input);

      assert.strictEqual(result.parsed.length, 2);
      assert.deepStrictEqual(result.parsed[0], { type: 'test', value: 123 });
      assert.deepStrictEqual(result.parsed[1], { type: 'test2', value: 456 });
      assert.strictEqual(result.remainder, '');
    });

    test('should handle incomplete JSON', () => {
      const chunk1 = '{"type":"test","val';
      const chunk2 = 'ue":123}{"type":"test2"';
      const chunk3 = ',"value":456}';

      let result = jsonParser.parseChunk(chunk1);
      assert.strictEqual(result.parsed.length, 0);
      assert.strictEqual(result.remainder, chunk1);

      result = jsonParser.parseChunk(chunk2, result.remainder);
      assert.strictEqual(result.parsed.length, 1);
      assert.deepStrictEqual(result.parsed[0], { type: 'test', value: 123 });

      result = jsonParser.parseChunk(chunk3, result.remainder);
      assert.strictEqual(result.parsed.length, 1);
      assert.deepStrictEqual(result.parsed[0], { type: 'test2', value: 456 });
    });

    test('should parse Claude message format', () => {
      const claudeMessage = JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: 'Hello!' },
            { type: 'tool_use', name: 'Calculator', input: { expression: '2+2' } },
          ],
          usage: { input_tokens: 5, output_tokens: 10 },
        },
      });

      const result = jsonParser.parseChunk(claudeMessage);
      assert.strictEqual(result.parsed.length, 1);

      const parsed = result.parsed[0] as any;
      assert.strictEqual(parsed.type, 'assistant');
      assert.strictEqual(parsed.message.content.length, 2);
      assert.strictEqual(parsed.message.content[0].text, 'Hello!');
      assert.strictEqual(parsed.message.content[1].name, 'Calculator');
    });

    test('should handle nested arrays and objects', () => {
      const complex = {
        type: 'result',
        data: {
          messages: [
            { id: 1, content: 'test' },
            { id: 2, content: 'test2' },
          ],
          metadata: {
            tokens: { input: 100, output: 200 },
            timing: [1.2, 3.4, 5.6],
          },
        },
      };

      const result = jsonParser.parseChunk(JSON.stringify(complex));
      assert.strictEqual(result.parsed.length, 1);
      assert.deepStrictEqual(result.parsed[0], complex);
    });
  });

  suite('Real-world Claude Stream Scenarios', () => {
    test('should handle TodoWrite tool usage', async () => {
      const todoWriteStream = [
        '{"type":"assistant","message":{"content":[{"type":"text","text":"I\'ll help you organize these tasks."}]}}\n',
        '{"type":"assistant","message":{"content":[{"type":"tool_use","name":"TodoWrite","input":{"todos":[',
        '{"id":"1","content":"Implement login feature","status":"pending","priority":"high"},',
        '{"id":"2","content":"Write unit tests","status":"in_progress","priority":"medium"},',
        '{"id":"3","content":"Update documentation","status":"completed","priority":"low"}',
        ']},"id":"tool_todo_123"}]}}\n',
        '{"type":"user","message":{"content":[{"type":"tool_result","content":"Todos updated successfully","tool_use_id":"tool_todo_123"}]}}\n',
      ];

      const stream = Readable.from(todoWriteStream);
      const messages: ClaudeStreamMessage[] = [];

      for await (const chunk of streamProcessor.processClaudeStream(stream)) {
        messages.push(chunk.data);
      }

      assert.strictEqual(messages.length, 3);

      // Verify TodoWrite structure
      const todoMsg = messages[1] as any;
      assert.strictEqual(todoMsg.message.content[0].name, 'TodoWrite');
      assert.strictEqual(todoMsg.message.content[0].input.todos.length, 3);
      assert.strictEqual(
        todoMsg.message.content[0].input.todos[0].content,
        'Implement login feature'
      );
      assert.strictEqual(todoMsg.message.content[0].input.todos[1].status, 'in_progress');
      assert.strictEqual(todoMsg.message.content[0].input.todos[2].priority, 'low');
    });

    test('should handle thinking content', async () => {
      // Note: Based on the extension code, thinking appears as a content type
      const thinkingStream = [
        '{"type":"assistant","message":{"content":[{"type":"thinking","thinking":"Let me analyze this problem step by step..."}]}}\n',
        '{"type":"assistant","message":{"content":[{"type":"text","text":"Based on my analysis, here\'s the solution:"}]}}\n',
      ];

      const stream = Readable.from(thinkingStream);
      const messages: ClaudeStreamMessage[] = [];

      for await (const chunk of streamProcessor.processClaudeStream(stream)) {
        messages.push(chunk.data);
      }

      assert.strictEqual(messages.length, 2);

      const thinkingMsg = messages[0] as any;
      assert.strictEqual(thinkingMsg.message.content[0].type, 'thinking');
      assert.strictEqual(
        thinkingMsg.message.content[0].thinking,
        'Let me analyze this problem step by step...'
      );
    });

    test('should handle error results', async () => {
      const errorStream = [
        '{"type":"result","subtype":"error","is_error":true,"result":"Invalid API key","session_id":"error_session"}\n',
      ];

      const stream = Readable.from(errorStream);
      const messages: ClaudeStreamMessage[] = [];

      for await (const chunk of streamProcessor.processClaudeStream(stream)) {
        messages.push(chunk.data);
      }

      assert.strictEqual(messages.length, 1);

      const errorMsg = messages[0] as any;
      assert.strictEqual(errorMsg.type, 'result');
      assert.strictEqual(errorMsg.subtype, 'error');
      assert.strictEqual(errorMsg.is_error, true);
      assert.strictEqual(errorMsg.result, 'Invalid API key');
    });

    test('should handle token usage updates', async () => {
      const tokenStream = [
        '{"type":"assistant","message":{"content":[{"type":"text","text":"Here\'s the answer."}],"usage":{"input_tokens":150,"output_tokens":75,"cache_creation_input_tokens":50,"cache_read_input_tokens":25}}}\n',
        '{"type":"result","subtype":"success","session_id":"123","input_tokens":150,"output_tokens":75,"thinking_tokens":10,"cost":0.0025}\n',
      ];

      const stream = Readable.from(tokenStream);
      const messages: ClaudeStreamMessage[] = [];

      for await (const chunk of streamProcessor.processClaudeStream(stream)) {
        messages.push(chunk.data);
      }

      assert.strictEqual(messages.length, 2);

      // Check inline usage
      const assistantMsg = messages[0] as any;
      assert.strictEqual(assistantMsg.message.usage.input_tokens, 150);
      assert.strictEqual(assistantMsg.message.usage.output_tokens, 75);
      assert.strictEqual(assistantMsg.message.usage.cache_creation_input_tokens, 50);

      // Check final result
      const resultMsg = messages[1] as any;
      assert.strictEqual(resultMsg.input_tokens, 150);
      assert.strictEqual(resultMsg.output_tokens, 75);
      assert.strictEqual(resultMsg.thinking_tokens, 10);
      assert.strictEqual(resultMsg.cost, 0.0025);
    });

    test('should handle mixed content in single message', async () => {
      const mixedStream = [
        '{"type":"assistant","message":{"content":[',
        '{"type":"text","text":"Let me search for that and calculate the result."},',
        '{"type":"tool_use","name":"WebSearch","input":{"query":"TypeScript generators"},"id":"search_1"},',
        '{"type":"tool_use","name":"Calculator","input":{"expression":"42 * 3.14"},"id":"calc_1"}',
        ']}}\n',
      ];

      const stream = Readable.from(mixedStream);
      const messages: ClaudeStreamMessage[] = [];

      for await (const chunk of streamProcessor.processClaudeStream(stream)) {
        messages.push(chunk.data);
      }

      assert.strictEqual(messages.length, 1);

      const msg = messages[0] as any;
      assert.strictEqual(msg.message.content.length, 3);
      assert.strictEqual(msg.message.content[0].type, 'text');
      assert.strictEqual(msg.message.content[1].type, 'tool_use');
      assert.strictEqual(msg.message.content[1].name, 'WebSearch');
      assert.strictEqual(msg.message.content[2].type, 'tool_use');
      assert.strictEqual(msg.message.content[2].name, 'Calculator');
    });
  });

  suite('Stream Transformation', () => {
    test('should batch stream chunks', async () => {
      const numbers = Array.from({ length: 25 }, (_, i) => `${i}\n`);
      const stream = Readable.from(numbers);

      const chunks = streamProcessor.processStream<string>(stream);
      const batched = streamProcessor.batchStream(chunks, 10, 50);

      const batches: any[] = [];
      for await (const batch of batched) {
        batches.push(batch);
      }

      assert.strictEqual(batches.length, 3);
      assert.strictEqual(batches[0].data.length, 10);
      assert.strictEqual(batches[1].data.length, 10);
      assert.strictEqual(batches[2].data.length, 5);
    });

    test('should rate limit stream', async () => {
      const items = ['1\n', '2\n', '3\n'];
      const stream = Readable.from(items);

      const chunks = streamProcessor.processStream<string>(stream);
      const rateLimited = streamProcessor.rateLimitStream(chunks, 10); // 10 items/sec = 100ms between items

      const start = Date.now();
      const times: number[] = [];

      for await (const chunk of rateLimited) {
        times.push(Date.now() - start);
      }

      // First item should be immediate, others should have ~100ms gaps
      assert.ok(times[0] < 50);
      assert.ok(times[1] >= 90 && times[1] < 150);
      assert.ok(times[2] >= 190 && times[2] < 250);
    });
  });
});
