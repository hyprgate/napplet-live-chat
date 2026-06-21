<script lang="ts">
  import { pubkeyColorStyle, resourceImage } from '@hyprgate/utils';
  import type { LiveChatMessage } from '../lib/types';
  import type { ProfileContent } from '../lib/profile-metadata';
  import { timeAgo, fullTimestamp } from '../lib/time';
  import NoteContent from '@hyprgate/napplet-ui/NoteContent.svelte';

  interface Props {
    message: LiveChatMessage;
    profile?: ProfileContent;
    now: number;
  }

  let { message, profile, now }: Props = $props();

  let displayName = $derived(
    profile?.display_name || profile?.name || `${message.pubkey.slice(0, 8)}…`,
  );
  let initial = $derived((profile?.display_name || profile?.name || message.pubkey).slice(0, 1).toUpperCase());
</script>

<div class="flex items-start gap-2 px-3 py-1 hover:bg-bg-surface/40">
  <!-- Avatar (req 11): picture if known, else a color-keyed initial block. -->
  {#if profile?.picture}
    <!-- External avatar via NAP-RESOURCE: the napplet CSP is img-src data: blob:,
         so resourceImage proxies the fetch through the shell and yields a blob URL. -->
    <img use:resourceImage={profile.picture} alt="" class="w-6 h-6 rounded-full object-cover flex-shrink-0 mt-0.5 bg-bg-surface" loading="lazy" />
  {:else}
    <div
      class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono flex-shrink-0 mt-0.5 bg-bg-surface"
      style={pubkeyColorStyle(message.pubkey)}
    >
      {initial}
    </div>
  {/if}

  <div class="min-w-0 flex-1">
    <div class="flex items-baseline gap-2">
      <span class="text-xs font-mono font-semibold truncate" style={pubkeyColorStyle(message.pubkey)}>
        {displayName}
      </span>
      <!-- Time-ago (req 12); full datetime on hover. -->
      <span class="text-[10px] font-mono text-text-dim flex-shrink-0" title={fullTimestamp(message.createdAt)}>
        {timeAgo(message.createdAt, now)}
      </span>
    </div>
    <div class="text-sm whitespace-pre-wrap break-words text-text-primary">
      <NoteContent content={message.content} emojiTags={message.tags} />
    </div>
  </div>
</div>
