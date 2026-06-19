<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { inc as ipc, identity } from '@napplet/sdk';
  import type { Subscription } from '@napplet/sdk';
  import {
    IDENTITY_CHANGED_TOPIC,
    LEGACY_AUTH_IDENTITY_CHANGED_TOPIC,
    parseIdentityChangedPayload,
    parseStreamChannelSwitchPayload,
    waitForPublicKey,
  } from '@hyprgate/utils';
  import { createLiveChatStore } from './lib/live-chat-store';
  import { parseStreamCurrentContextPayload } from './lib/stream-context-payload';
  import type { LiveChatTab } from './lib/types';
  import { subscribeProfileMetadata, type ProfileContent } from './lib/profile-metadata';
  import TabRow from './components/TabRow.svelte';
  import MessageList from './components/MessageList.svelte';
  import ComposeInput from './components/ComposeInput.svelte';
  import EmptyState from './components/EmptyState.svelte';

  // ── Reactive state bridged from the store (plain TS → $state via syncState) ──
  let tabs = $state<LiveChatTab[]>([]);
  let activeTab = $state<LiveChatTab | null>(null);
  let activeTabId = $state<string | null>(null);
  let error = $state<string | null>(null);
  // Ticks every 30s so relative timestamps stay fresh.
  let now = $state(Date.now());

  function syncState(): void {
    tabs = [...store.state.tabs];
    activeTabId = store.state.activeTabId;
    activeTab = activeTabId ? store.state.tabs.find((t) => t.id === activeTabId) ?? null : null;
    error = store.state.error;
  }

  const store = createLiveChatStore(syncState);

  // ── Profile metadata (avatar + name per message) ────────────────────────────
  let profileMapVersion = $state(0);
  const profileMap = new Map<string, ProfileContent>();
  const loadingPubkeys = new Set<string>();
  const profileSubs = new Set<Subscription>();

  let profiles = $derived.by(() => {
    // Return a NEW Map on each version bump so the prop reference changes and
    // MessageList re-renders when a profile resolves (Svelte won't react to a
    // mutated same-ref Map).
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    profileMapVersion;
    return new Map(profileMap);
  });

  $effect(() => {
    // Depend on `tabs` (reassigned to a fresh array on every store update) so
    // this re-runs as new messages stream in and fetches profiles for any
    // newly-seen authors — not just the authors present when the tab opened.
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    tabs;
    const current = activeTab;
    if (!current) return;
    const missing = [...new Set(current.messages.map((m) => m.pubkey))]
      .filter((pk) => pk.length > 0 && !loadingPubkeys.has(pk) && !profileMap.has(pk));
    if (missing.length === 0) return;
    for (const pk of missing) loadingPubkeys.add(pk);
    let sub: Subscription | null = null;
    try {
      sub = subscribeProfileMetadata(
        missing,
        (pk, meta) => { profileMap.set(pk, meta); profileMapVersion++; },
        () => { for (const pk of missing) loadingPubkeys.delete(pk); if (sub) profileSubs.delete(sub); },
      );
      profileSubs.add(sub);
    } catch {
      for (const pk of missing) loadingPubkeys.delete(pk);
    }
  });

  // ── Inter-pane subscriptions ────────────────────────────────────────────────
  let identitySub: Subscription | null = null;
  let legacyIdentitySub: Subscription | null = null;
  let channelSwitchSub: Subscription | null = null;
  let legacyChannelSwitchSub: Subscription | null = null;
  let currentContextSub: Subscription | null = null;
  let identityInitController: AbortController | null = null;
  let nowTimer: ReturnType<typeof setInterval> | null = null;

  /** Open (or focus) a stream tab from a channel-switch / open-chat payload. */
  function openFromPayload(payload: unknown): void {
    const parsed = parseStreamChannelSwitchPayload(payload);
    if (!parsed) return;
    const tabId = store.openStream(
      parsed.streamId,
      parsed.metadata.title ?? 'Live chat',
      parsed.metadata.chatRelays ?? [],
    );
    store.switchToTab(tabId); // req 4: prepend + focus
    syncState();
  }

  onMount(() => {
    identityInitController = new AbortController();

    const handleIdentityChanged = (payload: unknown) => {
      const pk = parseIdentityChangedPayload(payload)?.pubkey ?? null;
      if (pk && pk !== store.state.myPubkey) {
        store.init(pk);
        syncState();
      }
    };
    identitySub = ipc.on(IDENTITY_CHANGED_TOPIC, handleIdentityChanged);
    legacyIdentitySub = ipc.on(LEGACY_AUTH_IDENTITY_CHANGED_TOPIC, handleIdentityChanged);

    // Auto-on-switch (req 4): stream/radio emit NUB-02 stream:channel-switch.
    channelSwitchSub = ipc.on('stream:channel-switch', openFromPayload);
    legacyChannelSwitchSub = ipc.on('livestream:channel-switch', openFromPayload);

    // Pull-on-mount: when Live Chat opens (launcher, hotkey, or the player
    // "Open chat" button), ask the currently-playing stream/radio napplet for
    // its chat context so the active stream's tab appears immediately.
    currentContextSub = ipc.on('stream:current-context', (payload) => {
      const context = parseStreamCurrentContextPayload(payload);
      if (!context) return;
      const tabId = store.openStream(context.streamAddr, context.title, context.chatRelays);
      store.switchToTab(tabId);
      syncState();
    });
    ipc.emit('stream:current-context-get', [], JSON.stringify({ requestId: crypto.randomUUID() }));

    nowTimer = setInterval(() => { now = Date.now(); }, 30_000);

    void tryInitFromSigner(identityInitController.signal);
  });

  onDestroy(() => {
    identityInitController?.abort();
    store.destroy();
    identitySub?.close();
    legacyIdentitySub?.close();
    channelSwitchSub?.close();
    legacyChannelSwitchSub?.close();
    currentContextSub?.close();
    for (const sub of profileSubs) sub.close();
    profileSubs.clear();
    if (nowTimer) clearInterval(nowTimer);
  });

  async function tryInitFromSigner(signal: AbortSignal) {
    const pubkey = await waitForPublicKey(identity, { signal, intervalMs: 300 });
    if (pubkey) {
      store.init(pubkey);
      syncState();
    }
  }

  // ── Tab actions ──────────────────────────────────────────────────────────────
  function handleSelectTab(tabId: string) { store.switchToTab(tabId); syncState(); }
  function handleCloseTab(tabId: string) { store.closeTab(tabId); syncState(); }

  async function handleSend(content: string) {
    if (!activeTab) return;
    try {
      await store.sendChat(activeTab.streamAddr, content);
    } catch (err) {
      store.state.error = `Send failed: ${err instanceof Error ? err.message : 'unknown error'}`;
      syncState();
    }
  }
</script>

<div class="app h-screen w-screen overflow-hidden bg-bg-base text-text-primary font-mono flex flex-col">
  {#if tabs.length > 0}
    <TabRow {tabs} {activeTabId} onselecttab={handleSelectTab} onclosetab={handleCloseTab} />
  {/if}

  <div class="flex-1 overflow-hidden flex flex-col">
    {#if activeTab}
      <MessageList messages={activeTab.messages} {profiles} {now} />
      <ComposeInput placeholder={`Chat in ${activeTab.title}…`} onsend={handleSend} />
    {:else}
      <EmptyState />
    {/if}
  </div>

  {#if error}
    <div class="absolute bottom-16 left-0 right-0 mx-3 px-3 py-2 bg-bg-surface border border-accent-red/40 rounded text-accent-red text-xs font-mono">
      {error}
      <button class="ml-2 text-text-dim hover:text-text-primary cursor-pointer" onclick={() => { store.state.error = null; syncState(); }}>[x]</button>
    </div>
  {/if}
</div>
