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
  <!-- Keep the fallback beneath the resource image so failed remote avatars stay useful. -->
  <div
    class="grid w-6 h-6 rounded-full overflow-hidden flex-shrink-0 mt-0.5 bg-bg-surface"
    style={pubkeyColorStyle(message.pubkey)}
  >
    <span class="col-start-1 row-start-1 flex items-center justify-center text-xs font-mono">{initial}</span>
    {#if profile?.picture}
      <img use:resourceImage={profile.picture} alt="" class="col-start-1 row-start-1 w-full h-full object-cover" loading="lazy" />
    {/if}
  </div>

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
