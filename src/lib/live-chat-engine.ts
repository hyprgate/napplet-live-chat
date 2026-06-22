// napplets/live-chat/src/lib/live-chat-engine.ts
// Pure / stateless live-chat logic, split out of the store factory.
// Functions operate on an explicit LiveChatContext so they stay
// vitest-importable and keep createLiveChatStore small.

import { KIND_ZAP_RECEIPT, type NostrEvent } from '@hyprgate/types';
import { parseZapReceipt } from '@hyprgate/utils';
import { outbox, relay, type Subscription } from '@napplet/sdk';
import { KIND_LIVE_CHAT, type LiveChatMessage, type LiveChatState, type LiveChatTab } from './types.js';

export interface LiveChatContext {
  state: LiveChatState;
  /** Open relay subscriptions keyed by tab id. */
  subs: Map<string, Subscription>;
  /** Fired after any state mutation that the UI should observe. */
  notify(): void;
}

interface NappletShellHandle {
  supports(domain: string, protocol?: string): boolean;
}

function getShell(): NappletShellHandle | null {
  return (globalThis as unknown as { napplet?: { shell?: NappletShellHandle } }).napplet?.shell ?? null;
}

function supportsOutbox(): boolean {
  return getShell()?.supports('outbox') ?? false;
}

function normalizeRelays(relays: string[]): string[] {
  return [...new Set(relays.filter((relayUrl) => relayUrl.startsWith('wss://')))];
}

function closeAll(subs: Subscription[]): void {
  for (const sub of subs) sub.close();
}

/** Insert a message keeping the list sorted ascending by createdAt (newest at bottom). */
export function insertSorted(messages: LiveChatMessage[], msg: LiveChatMessage): void {
  let lo = 0;
  let hi = messages.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (messages[mid]!.createdAt <= msg.createdAt) lo = mid + 1;
    else hi = mid;
  }
  messages.splice(lo, 0, msg);
}

export function findTab(ctx: LiveChatContext, tabId: string): LiveChatTab | undefined {
  return ctx.state.tabs.find((t) => t.id === tabId);
}

export function appendMessage(ctx: LiveChatContext, tab: LiveChatTab, msg: LiveChatMessage): void {
  if (tab.messages.some((m) => m.id === msg.id)) return; // dedup
  insertSorted(tab.messages, msg);
  tab.messages = [...tab.messages];
  if (msg.createdAt > tab.lastMessageAt) tab.lastMessageAt = msg.createdAt;
  if (ctx.state.activeTabId !== tab.id) tab.unreadCount += 1;
  ctx.notify();
}

export function openSubscription(ctx: LiveChatContext, tab: LiveChatTab): void {
  if (ctx.subs.has(tab.id)) return;
  const chatRelays = normalizeRelays(tab.chatRelays);
  const filters = [
    { kinds: [KIND_LIVE_CHAT], '#a': [tab.streamAddr] },
    { kinds: [KIND_ZAP_RECEIPT], '#a': [tab.streamAddr] },
  ];
  const onEose = (): void => {
    ctx.state.loading = false;
    ctx.notify();
  };
  const onEvent = (event: NostrEvent): void => ingestEvent(ctx, event);
  const subs: Subscription[] = [];

  if (supportsOutbox()) {
    const outboxSub = outbox.subscribe(filters, {
      strategy: 'outbox',
      live: true,
      ...(chatRelays.length > 0 ? { relays: chatRelays } : {}),
    });
    outboxSub.on('event', (event) => onEvent(event as NostrEvent));
    outboxSub.on('eose', onEose);
    outboxSub.on('closed', onEose);
    subs.push({ close: () => outboxSub.close() });
  } else {
    // Shared pool covers configured super relays; one scoped relay keeps legacy
    // exact-chat-relay behavior for runtimes without NAP-OUTBOX.
    subs.push(relay.subscribe(filters, onEvent, onEose));
    if (chatRelays[0]) {
      subs.push(relay.subscribe(filters, onEvent, onEose, { relay: chatRelays[0], group: tab.streamAddr }));
    }
  }

  ctx.subs.set(tab.id, { close: () => closeAll(subs) });
}

export function closeSubscription(ctx: LiveChatContext, tabId: string): void {
  const sub = ctx.subs.get(tabId);
  if (sub) {
    sub.close();
    ctx.subs.delete(tabId);
  }
}

export function ingestEvent(ctx: LiveChatContext, event: NostrEvent): void {
  if (event.kind === KIND_LIVE_CHAT) {
    ingestChat(ctx, event);
  } else if (event.kind === KIND_ZAP_RECEIPT) {
    ingestZap(ctx, event);
  }
}

function ingestChat(ctx: LiveChatContext, event: NostrEvent): void {
  const aTag = event.tags.find((t) => t[0] === 'a' && typeof t[1] === 'string');
  if (!aTag) return;
  const tab = ctx.state.tabs.find((t) => t.streamAddr === aTag[1]);
  if (!tab) return;
  appendMessage(ctx, tab, {
    id: event.id,
    pubkey: event.pubkey,
    content: event.content,
    tags: event.tags.map((tag) => [...tag]),
    createdAt: event.created_at,
    isOwn: event.pubkey === ctx.state.myPubkey,
    kind: 'chat',
  });
}

export function openStream(ctx: LiveChatContext, streamAddr: string, title: string, chatRelays: string[] = []): string {
  const existing = findTab(ctx, streamAddr);
  if (existing) {
    // Merge in any newly-learned relays; refresh the subscription if it gained one.
    if (chatRelays.length > 0 && existing.chatRelays.length === 0) {
      existing.chatRelays = [...chatRelays];
      closeSubscription(ctx, existing.id);
      openSubscription(ctx, existing);
    }
    if (title && existing.title !== title) existing.title = title;
    ctx.notify();
    return streamAddr;
  }

  const tab: LiveChatTab = {
    id: streamAddr,
    streamAddr,
    chatRelays: [...chatRelays],
    title: title || 'Live chat',
    unreadCount: 0,
    lastMessageAt: 0,
    messages: [],
  };
  // Prepend (req 4: newest stream tab first).
  ctx.state.tabs = [tab, ...ctx.state.tabs];
  ctx.state.loading = true;
  openSubscription(ctx, tab);
  ctx.notify();
  return streamAddr;
}

export function switchToTab(ctx: LiveChatContext, tabId: string): void {
  const tab = findTab(ctx, tabId);
  if (!tab) return;
  ctx.state.activeTabId = tabId;
  tab.unreadCount = 0;
  ctx.notify();
}

export function closeTab(ctx: LiveChatContext, tabId: string): void {
  const tab = findTab(ctx, tabId);
  if (!tab) return;
  closeSubscription(ctx, tabId);
  const index = ctx.state.tabs.findIndex((t) => t.id === tabId);
  ctx.state.tabs = ctx.state.tabs.filter((t) => t.id !== tabId);
  if (ctx.state.activeTabId === tabId) {
    const next = ctx.state.tabs[index] ?? ctx.state.tabs[index - 1] ?? null;
    ctx.state.activeTabId = next?.id ?? null;
    if (next) next.unreadCount = 0;
  }
  ctx.notify();
}

export async function sendChat(streamAddr: string, content: string, chatRelays: string[] = []): Promise<void> {
  const trimmed = content.trim();
  if (!trimmed) return;
  const template = {
    kind: KIND_LIVE_CHAT,
    content: trimmed,
    tags: [['a', streamAddr]],
    created_at: Math.floor(Date.now() / 1000),
  };
  const relayHints = normalizeRelays(chatRelays);

  if (supportsOutbox()) {
    const result = await outbox.publish(template, {
      strategy: 'outbox',
      ...(relayHints.length > 0 ? { relays: relayHints } : {}),
    });
    if (!result.ok) throw new Error(result.error ?? 'outbox publish failed');
    return;
  }

  await relay.publish(template);
}

function ingestZap(ctx: LiveChatContext, event: NostrEvent): void {
  const parsed = parseZapReceipt(event);
  if (!parsed) return;
  // Match the zap to a tab whose stream address it targets (#a).
  const tab = ctx.state.tabs.find((t) => parsed.targetAddresses.includes(t.streamAddr));
  if (!tab) return;
  const sender = parsed.senderPubkey ?? parsed.providerPubkey;
  appendMessage(ctx, tab, {
    id: event.id,
    pubkey: sender,
    content: parsed.comment,
    tags: [],
    createdAt: parsed.createdAt,
    isOwn: sender === ctx.state.myPubkey,
    kind: 'zap',
    amountSats: Math.round(parsed.amountSats),
  });
}
