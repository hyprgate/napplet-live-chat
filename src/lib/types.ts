// napplets/live-chat/src/lib/types.ts
// Live Chat types — focused on NIP-53 stream / radio live chat (kind 1311).
// No DMs, no NIP-29 groups (those lived in the now-removed napplets/chat).

import type { NostrEvent } from '@hyprgate/types';

/** A single rendered line in a live-chat tab: a chat message or a zap. */
export interface LiveChatMessage {
  /** Source event id (kind 1311 chat, or kind 9735 zap receipt). */
  id: string;
  /** Author pubkey (chat author, or zap sender when known). */
  pubkey: string;
  /** Message text (chat content, or zap comment). */
  content: string;
  /** Event tags retained for NIP-30 custom emoji rendering. */
  tags: string[][];
  /** Unix seconds. */
  createdAt: number;
  /** Whether the current user authored it. */
  isOwn: boolean;
  /** Distinguishes a normal chat line from a zap line (amber rendering). */
  kind: 'chat' | 'zap';
  /** Zap amount in sats — only set when kind === 'zap'. */
  amountSats?: number;
}

/** One open stream/station chat tab. */
export interface LiveChatTab {
  /** Tab id === the NIP-53 stream address "30311:<pubkey>:<dtag>". */
  id: string;
  /** Same as id; explicit for clarity at call sites. */
  streamAddr: string;
  /** Optional relay hints from the 30311/31237 "relays" tag; empty uses shared relay/outbox routing. */
  chatRelays: string[];
  /** Display title (stream/station name). */
  title: string;
  /** Unread count since this tab was last active. */
  unreadCount: number;
  /** Timestamp of the most recent line (for ordering / cues). */
  lastMessageAt: number;
  /** Rendered lines, kept sorted ascending by createdAt (newest at bottom). */
  messages: LiveChatMessage[];
}

/** Full live-chat store state. */
export interface LiveChatState {
  /** Open tabs; newest-opened first (auto-prepend on channel switch). */
  tabs: LiveChatTab[];
  /** Currently focused tab id, or null when none open. */
  activeTabId: string | null;
  /** True between opening a tab and its first message/EOSE. */
  loading: boolean;
  /** Last error string, or null. */
  error: string | null;
  /** Current user's hex pubkey (for isOwn + sending). */
  myPubkey: string | null;
}

/** Public interface returned by createLiveChatStore(). */
export interface LiveChatStore {
  state: LiveChatState;
  /** Set the current user's pubkey (for isOwn / sending). */
  init(pubkey: string): void;
  /**
   * Open (or focus) a stream tab. Existing tabs are reused (and relays merged);
   * new tabs are prepended. Returns the tab id. Does NOT change the active tab —
   * callers focus explicitly via switchToTab (req 4: prepend + focus on switch).
   */
  openStream(streamAddr: string, title: string, chatRelays?: string[]): string;
  /** Focus a tab and clear its unread count. */
  switchToTab(tabId: string): void;
  /** Close a tab and its subscription. */
  closeTab(tabId: string): void;
  /** Ingest a relay event (kind 1311 chat or kind 9735 zap). Exposed for tests. */
  ingestEvent(event: NostrEvent): void;
  /** Publish a kind-1311 chat message to a stream. */
  sendChat(streamAddr: string, content: string, chatRelays?: string[]): Promise<void>;
  /** Close every open subscription. */
  destroy(): void;
}

/** Kind for NIP-53 live chat messages. */
export const KIND_LIVE_CHAT = 1311;
