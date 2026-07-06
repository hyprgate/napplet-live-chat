// napplets/live-chat/src/lib/live-chat-store.test.ts
// Unit tests for createLiveChatStore — kind 1311 ingest, zap rendering, tab model.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NostrEvent } from '@hyprgate/types';
import { KIND_ZAP_RECEIPT, KIND_ZAP_REQUEST } from '@hyprgate/types';
import { createLiveChatStore } from './live-chat-store';

vi.mock('@napplet/sdk', () => ({
  outbox: {
    subscribe: vi.fn().mockReturnValue({ on: vi.fn(), close: vi.fn() }),
    publish: vi.fn().mockResolvedValue({ ok: true }),
  },
  relay: {
    subscribe: vi.fn().mockReturnValue({ close: vi.fn() }),
    publish: vi.fn().mockResolvedValue({}),
  },
}));

import { outbox, relay } from '@napplet/sdk';
const mockOutboxSubscribe = vi.mocked(outbox.subscribe);
const mockOutboxPublish = vi.mocked(outbox.publish);
const mockSubscribe = vi.mocked(relay.subscribe);
const mockPublish = vi.mocked(relay.publish);

const STREAM = '30311:hostpubkey:main';

function chatEvent(
  id: string,
  createdAt: number,
  content = `msg ${id}`,
  pubkey = 'author1',
  addr = STREAM,
  tags: string[][] = [],
): NostrEvent {
  return { id, kind: 1311, pubkey, created_at: createdAt, tags: [['a', addr], ...tags], content, sig: 'sig' };
}

function zapEvent(id: string, createdAt: number, sats: number, sender = 'zapper1', addr = STREAM): NostrEvent {
  const request = {
    id: `${id}-req`, kind: KIND_ZAP_REQUEST, pubkey: sender, created_at: createdAt,
    tags: [['a', addr], ['amount', String(sats * 1000)]], content: 'zap comment', sig: 's',
  };
  return {
    id, kind: KIND_ZAP_RECEIPT, pubkey: 'lnprovider', created_at: createdAt,
    tags: [['a', addr], ['amount', String(sats * 1000)], ['description', JSON.stringify(request)]],
    content: '', sig: 'sig',
  };
}

beforeEach(() => {
  delete (globalThis as { napplet?: unknown }).napplet;
  mockOutboxSubscribe.mockClear();
  mockOutboxPublish.mockClear();
  mockOutboxSubscribe.mockReturnValue({ on: vi.fn(), close: vi.fn() } as ReturnType<typeof outbox.subscribe>);
  mockOutboxPublish.mockResolvedValue({ ok: true });
  mockSubscribe.mockClear();
  mockPublish.mockClear();
  mockSubscribe.mockReturnValue({ close: vi.fn() });
});

function setOutboxSupport(supported: boolean): void {
  (globalThis as unknown as { napplet: { shell: { supports: (domain: string) => boolean } } }).napplet = {
    shell: {
      supports: (domain: string) => domain === 'outbox' && supported,
    },
  };
}

describe('createLiveChatStore', () => {
  it('openStream creates a tab, opens subscriptions, and prepends newest first', () => {
    const store = createLiveChatStore();
    store.openStream(STREAM, 'Cool Stream', ['wss://relay.example']);
    store.openStream('30311:other:x', 'Other', []);

    expect(store.state.tabs.map((t) => t.id)).toEqual(['30311:other:x', STREAM]);
    expect(mockSubscribe).toHaveBeenCalledTimes(3);
    // First tab subscribed scoped to its chat relay.
    const exactRelayCall = mockSubscribe.mock.calls.find((call) => (call[3] as { relay?: string } | undefined)?.relay === 'wss://relay.example');
    expect(exactRelayCall).toBeDefined();
    expect(mockSubscribe.mock.calls.some((call) => call[3] === undefined)).toBe(true);
  });

  it('uses outbox live subscription with all advertised chat relay hints when supported', () => {
    setOutboxSupport(true);
    const store = createLiveChatStore();
    store.openStream(STREAM, 'Cool Stream', ['wss://chat-a.example', 'wss://chat-b.example']);

    expect(mockOutboxSubscribe).toHaveBeenCalledTimes(1);
    expect(mockOutboxSubscribe).toHaveBeenCalledWith(
      [
        { kinds: [1311], '#a': [STREAM] },
        { kinds: [KIND_ZAP_RECEIPT], '#a': [STREAM] },
      ],
      { relays: ['wss://chat-a.example', 'wss://chat-b.example'] },
    );
    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it('falls back to shared relay plus first exact chat relay when outbox is unsupported', () => {
    setOutboxSupport(false);
    const store = createLiveChatStore();
    store.openStream(STREAM, 'Cool Stream', ['wss://chat-a.example', 'wss://chat-b.example']);

    expect(mockOutboxSubscribe).not.toHaveBeenCalled();
    expect(mockSubscribe).toHaveBeenCalledTimes(2);
    expect(mockSubscribe.mock.calls[0]![3]).toBeUndefined();
    expect(mockSubscribe.mock.calls[1]![3]).toEqual({ relay: 'wss://chat-a.example', group: STREAM });
  });

  it('re-opening an existing stream returns the same tab without duplicating', () => {
    const store = createLiveChatStore();
    const a = store.openStream(STREAM, 'Cool Stream', []);
    const b = store.openStream(STREAM, 'Cool Stream', []);
    expect(a).toBe(b);
    expect(store.state.tabs).toHaveLength(1);
  });

  it('ingests kind-1311 chat into the matching tab, sorted and deduped', () => {
    const store = createLiveChatStore();
    store.openStream(STREAM, 'Cool Stream', []);
    store.ingestEvent(chatEvent('m2', 2000));
    store.ingestEvent(chatEvent('m1', 1000));
    store.ingestEvent(chatEvent('m2', 2000)); // duplicate

    const tab = store.state.tabs[0]!;
    expect(tab.messages.map((m) => m.id)).toEqual(['m1', 'm2']); // chronological
    expect(tab.messages.every((m) => m.kind === 'chat')).toBe(true);
  });

  it('preserves kind-1311 tags for NIP-30 custom emoji rendering', () => {
    const store = createLiveChatStore();
    store.openStream(STREAM, 'Cool Stream', []);
    store.ingestEvent(chatEvent('m1', 1000, 'hello :blobcat:', 'author1', STREAM, [
      ['emoji', 'blobcat', 'https://emoji.example/blobcat.png'],
    ]));

    expect(store.state.tabs[0]!.messages[0]!.tags).toEqual([
      ['a', STREAM],
      ['emoji', 'blobcat', 'https://emoji.example/blobcat.png'],
    ]);
  });

  it('renders kind-9735 zaps with sats amount in the matching tab', () => {
    const store = createLiveChatStore();
    store.openStream(STREAM, 'Cool Stream', []);
    store.ingestEvent(zapEvent('z1', 1500, 21));

    const tab = store.state.tabs[0]!;
    const zap = tab.messages.find((m) => m.kind === 'zap');
    expect(zap).toBeDefined();
    expect(zap!.amountSats).toBe(21);
    expect(zap!.pubkey).toBe('zapper1');
  });

  it('drops events that target an unknown stream', () => {
    const store = createLiveChatStore();
    store.openStream(STREAM, 'Cool Stream', []);
    store.ingestEvent(chatEvent('x', 1000, 'msg', 'a', '30311:nobody:y'));
    expect(store.state.tabs[0]!.messages).toHaveLength(0);
  });

  it('bumps unread for non-active tabs and clears on switch', () => {
    const store = createLiveChatStore();
    store.openStream(STREAM, 'Cool Stream', []);
    // no active tab yet → unread bumps
    store.ingestEvent(chatEvent('m1', 1000));
    expect(store.state.tabs[0]!.unreadCount).toBe(1);
    store.switchToTab(STREAM);
    expect(store.state.tabs[0]!.unreadCount).toBe(0);
    // active tab → no bump
    store.ingestEvent(chatEvent('m2', 2000));
    expect(store.state.tabs[0]!.unreadCount).toBe(0);
  });

  it('marks isOwn for the current user\'s messages', () => {
    const store = createLiveChatStore();
    store.init('me');
    store.openStream(STREAM, 'Cool Stream', []);
    store.ingestEvent(chatEvent('mine', 1000, 'hi', 'me'));
    expect(store.state.tabs[0]!.messages[0]!.isOwn).toBe(true);
  });

  it('closeTab removes the tab, closes its subscription, and reassigns active', () => {
    const closeSpy = vi.fn();
    mockSubscribe.mockReturnValue({ close: closeSpy });
    const store = createLiveChatStore();
    store.openStream(STREAM, 'Cool Stream', []);
    store.switchToTab(STREAM);
    store.closeTab(STREAM);
    expect(closeSpy).toHaveBeenCalled();
    expect(store.state.tabs).toHaveLength(0);
    expect(store.state.activeTabId).toBeNull();
  });

  it('sendChat publishes a kind-1311 event tagged with the stream address', async () => {
    const store = createLiveChatStore();
    await store.sendChat(STREAM, '  hello world  ');
    expect(mockPublish).toHaveBeenCalledTimes(1);
    const published = mockPublish.mock.calls[0]![0] as { kind: number; content: string; tags: string[][] };
    expect(published.kind).toBe(1311);
    expect(published.content).toBe('hello world');
    expect(published.tags).toContainEqual(['a', STREAM]);
  });

  it('sendChat uses outbox publish with all advertised chat relay hints when supported', async () => {
    setOutboxSupport(true);
    const store = createLiveChatStore();
    await store.sendChat(STREAM, '  hello world  ', ['wss://chat-a.example', 'wss://chat-b.example']);

    expect(mockOutboxPublish).toHaveBeenCalledTimes(1);
    expect(mockOutboxPublish).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 1311,
        content: 'hello world',
        tags: [['a', STREAM]],
      }),
      { relays: ['wss://chat-a.example', 'wss://chat-b.example'] },
    );
    expect(mockPublish).not.toHaveBeenCalled();
  });
});
