<script lang="ts">
  import { tick } from 'svelte';
  import type { LiveChatMessage } from '../lib/types';
  import type { ProfileContent } from '../lib/profile-metadata';
  import MessageItem from './MessageItem.svelte';
  import ZapMessage from './ZapMessage.svelte';

  interface Props {
    messages: LiveChatMessage[];
    profiles: Map<string, ProfileContent>;
    now: number;
  }

  let { messages, profiles, now }: Props = $props();

  let scroller: HTMLDivElement | undefined = $state(undefined);

  // Auto-scroll to bottom as new messages arrive (feed anchored to the bottom, req 10).
  $effect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    messages.length;
    tick().then(() => {
      if (scroller) scroller.scrollTop = scroller.scrollHeight;
    });
  });
</script>

<div bind:this={scroller} class="flex-1 overflow-y-auto py-2">
  {#if messages.length === 0}
    <div class="h-full flex items-center justify-center">
      <p class="text-text-dim text-xs font-mono">&gt; waiting for messages…</p>
    </div>
  {:else}
    {#each messages as message (message.id)}
      {#if message.kind === 'zap'}
        <ZapMessage {message} profile={profiles.get(message.pubkey)} {now} />
      {:else}
        <MessageItem {message} profile={profiles.get(message.pubkey)} {now} />
      {/if}
    {/each}
  {/if}
</div>
