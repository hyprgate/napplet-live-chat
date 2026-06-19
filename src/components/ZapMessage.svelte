<script lang="ts">
  import { pubkeyColorStyle } from '@hyprgate/utils';
  import type { LiveChatMessage } from '../lib/types';
  import type { ProfileContent } from '../lib/profile-metadata';
  import { timeAgo, fullTimestamp } from '../lib/time';

  interface Props {
    message: LiveChatMessage;
    profile?: ProfileContent;
    now: number;
  }

  let { message, profile, now }: Props = $props();

  let displayName = $derived(
    profile?.display_name || profile?.name || `${message.pubkey.slice(0, 8)}…`,
  );
</script>

<!-- Zap line (req 13): amber-accent rule via the theme warning token. -->
<div class="flex items-start gap-2 px-3 py-1 mx-2 my-1 rounded border border-accent-amber/40 bg-accent-amber/10">
  <span class="text-accent-amber text-sm flex-shrink-0 mt-0.5" aria-hidden="true">⚡</span>
  <div class="min-w-0 flex-1">
    <div class="flex items-baseline gap-2 flex-wrap">
      <span class="text-xs font-mono font-semibold truncate" style={pubkeyColorStyle(message.pubkey)}>
        {displayName}
      </span>
      <span class="text-xs font-mono font-semibold text-accent-amber flex-shrink-0">
        zapped {message.amountSats?.toLocaleString() ?? 0} sats
      </span>
      <span class="text-[10px] font-mono text-text-dim flex-shrink-0" title={fullTimestamp(message.createdAt)}>
        {timeAgo(message.createdAt, now)}
      </span>
    </div>
    {#if message.content}
      <p class="text-sm whitespace-pre-wrap break-words text-text-primary">{message.content}</p>
    {/if}
  </div>
</div>
