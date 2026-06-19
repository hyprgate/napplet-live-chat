// napplets/live-chat/src/lib/live-chat-store.ts
// Live-chat state machine — pure TypeScript, no Svelte runes (vitest-importable).
//
// Focused on NIP-53 stream / radio live chat (kind 1311) + zap rendering
// (kind 9735). Relay ops route through the shell pseudo-relay via @napplet/sdk.
//
// Unlike the removed napplets/chat (single active-tab subscription), live-chat keeps
// ONE subscription per open tab so background tabs accrue messages + unread counts.
//
// All state-mutating logic lives in ./live-chat-engine and operates on an explicit
// LiveChatContext; this factory just wires a context to the public interface.

import { type Subscription } from "@napplet/sdk";
import {
  closeTab,
  ingestEvent,
  openStream,
  sendChat,
  switchToTab,
  type LiveChatContext,
} from "./live-chat-engine.js";
import { type LiveChatState, type LiveChatStore } from "./types.js";

export function createLiveChatStore(onUpdate?: () => void): LiveChatStore {
  const state: LiveChatState = {
    tabs: [],
    activeTabId: null,
    loading: false,
    error: null,
    myPubkey: null,
  };

  // One relay subscription per open tab (keyed by tab id / streamAddr).
  const subs = new Map<string, Subscription>();

  const ctx: LiveChatContext = {
    state,
    subs,
    notify: () => onUpdate?.(),
  };

  return {
    state,
    init(pubkey: string): void {
      state.myPubkey = pubkey;
      ctx.notify();
    },
    openStream: (streamAddr, title, chatRelays) => openStream(ctx, streamAddr, title, chatRelays),
    switchToTab: (tabId) => switchToTab(ctx, tabId),
    closeTab: (tabId) => closeTab(ctx, tabId),
    ingestEvent: (event) => ingestEvent(ctx, event),
    sendChat,
    destroy(): void {
      for (const sub of subs.values()) sub.close();
      subs.clear();
    },
  };
}
