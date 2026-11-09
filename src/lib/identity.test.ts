import { describe, expect, it } from 'vitest';
import { continuesPrevious, displayName, sendFailureMessage, shortNpub } from './identity';
import type { LiveChatMessage } from './types';

const PUBKEY = '79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798';

function message(overrides: Partial<LiveChatMessage> = {}): LiveChatMessage {
  return { id: 'a', pubkey: PUBKEY, content: 'hi', tags: [], createdAt: 1000, isOwn: false, kind: 'chat', ...overrides };
}

describe('displayName', () => {
  it('prefers the display name, then the name', () => {
    expect(displayName({ display_name: 'Ines', name: 'ines' }, PUBKEY)).toBe('Ines');
    expect(displayName({ name: 'ines' }, PUBKEY)).toBe('ines');
  });

  it('falls back to a short npub with both ends kept', () => {
    expect(displayName(undefined, PUBKEY)).toBe('npub10xlxvlh…pkge6d');
    expect(displayName({ display_name: '  ' }, PUBKEY)).toBe(shortNpub(PUBKEY));
  });
});

describe('continuesPrevious', () => {
  it('groups the same person within five minutes', () => {
    expect(continuesPrevious(message({ createdAt: 1200 }), message())).toBe(true);
  });

  it('starts a new block for someone else, a long gap, a zap or the first line', () => {
    expect(continuesPrevious(message({ pubkey: 'b'.repeat(64) }), message())).toBe(false);
    expect(continuesPrevious(message({ createdAt: 1400 }), message())).toBe(false);
    expect(continuesPrevious(message({ kind: 'zap' }), message())).toBe(false);
    expect(continuesPrevious(message({ createdAt: 1100 }), message({ kind: 'zap' }))).toBe(false);
    expect(continuesPrevious(message(), undefined)).toBe(false);
  });
});

describe('sendFailureMessage', () => {
  it('explains a read-only session in plain words', () => {
    expect(sendFailureMessage('Cant sign events with readonly')).toContain('read-only');
    expect(sendFailureMessage('Cant sign events with readonly')).not.toContain('Cant');
  });

  it('passes other reasons through', () => {
    expect(sendFailureMessage('relay said no')).toBe("Your message didn't send: relay said no");
    expect(sendFailureMessage('')).toBe("Your message didn't send.");
  });
});
