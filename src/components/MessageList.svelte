<script lang="ts">
  import { tick } from 'svelte';
  import type { LiveChatMessage } from '../lib/types';
  import type { ProfileContent } from '../lib/profile-metadata';
  import { continuesPrevious } from '../lib/identity';
  import MessageItem from './MessageItem.svelte';
  import ZapMessage from './ZapMessage.svelte';

  interface Props {
    messages: LiveChatMessage[];
    profiles: Map<string, ProfileContent>;
    now: number;
    onperson?: (pubkey: string) => void;
  }

  let { messages, profiles, now, onperson }: Props = $props();

  const NEAR_BOTTOM_PX = 48;

  let scroller: HTMLDivElement | undefined = $state(undefined);
  let followLatest = $state(true);
  let newWhileAway = $state(0);
  let seenCount = 0;

  function scrollToLatest(): void {
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
    followLatest = true;
    newWhileAway = 0;
  }

  function handleScroll(): void {
    if (!scroller) return;
    followLatest = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < NEAR_BOTTOM_PX;
    if (followLatest) newWhileAway = 0;
  }

  // Stay anchored to the newest line, unless someone has scrolled up to read.
  $effect(() => {
    const count = messages.length;
    const added = Math.max(0, count - seenCount);
    seenCount = count;
    if (followLatest) {
      void tick().then(scrollToLatest);
    } else {
      newWhileAway += added;
    }
  });
</script>

<div class="relative flex-1 min-h-0 flex flex-col">
  <div bind:this={scroller} class="flex-1 overflow-y-auto pb-2" onscroll={handleScroll} data-chat-scroller>
    {#if messages.length === 0}
      <div class="h-full flex items-center justify-center px-6 text-center">
        <p class="text-text-muted text-sm font-mono">No messages yet. New ones will show up here.</p>
      </div>
    {:else}
      {#each messages as message, index (message.id)}
        {#if message.kind === 'zap'}
          <ZapMessage {message} profile={profiles.get(message.pubkey)} {now} {onperson} />
        {:else}
          <MessageItem
            {message}
            profile={profiles.get(message.pubkey)}
            {now}
            {onperson}
            continued={continuesPrevious(message, messages[index - 1])}
          />
        {/if}
      {/each}
    {/if}
  </div>

  {#if !followLatest}
    <button type="button" class="jump" onclick={scrollToLatest}>
      {newWhileAway > 0 ? `${newWhileAway} new` : 'Jump to latest'}
    </button>
  {/if}
</div>

<style>
  .jump {
    position: absolute;
    bottom: 8px;
    left: 50%;
    transform: translateX(-50%);
    padding: 4px 12px;
    font: inherit;
    font-size: 12px;
    color: var(--hg-text-primary, #f2efe7);
    background: var(--hg-bg-elevated, #1a1a1a);
    border: 1px solid var(--hg-accent-green, #70f0a0);
    border-radius: 999px;
    cursor: pointer;
  }

  .jump:focus-visible {
    outline: 2px solid var(--hg-accent-green, #70f0a0);
    outline-offset: 2px;
  }
</style>
