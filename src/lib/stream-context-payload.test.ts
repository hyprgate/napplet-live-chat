import { describe, expect, it } from 'vitest';
import { parseStreamCurrentContextPayload } from './stream-context-payload.js';

describe('parseStreamCurrentContextPayload', () => {
  it('accepts object payloads from shell-delivered stream context events', () => {
    expect(parseStreamCurrentContextPayload({
      streamAddr: '30311:host:stream',
      title: 'Live stream',
      chatRelays: ['wss://relay.example', 1],
    })).toEqual({
      streamAddr: '30311:host:stream',
      title: 'Live stream',
      chatRelays: ['wss://relay.example'],
    });
  });

  it('accepts JSON-string payloads emitted by stream and radio napplets', () => {
    expect(parseStreamCurrentContextPayload(JSON.stringify({
      streamAddr: '30311:radio:station',
      title: 'Radio station',
      chatRelays: ['wss://radio.example'],
    }))).toEqual({
      streamAddr: '30311:radio:station',
      title: 'Radio station',
      chatRelays: ['wss://radio.example'],
    });
  });

  it('rejects empty or missing stream context so Live Chat stays in empty state', () => {
    expect(parseStreamCurrentContextPayload(JSON.stringify({
      streamAddr: null,
      title: null,
      chatRelays: [],
    }))).toBeNull();
    expect(parseStreamCurrentContextPayload('not json')).toBeNull();
  });
});
