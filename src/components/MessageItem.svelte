<script lang="ts">
  import type { LiveChatMessage } from '../lib/types';
  import type { ProfileContent } from '../lib/profile-metadata';
  import { timeAgo, fullTimestamp } from '../lib/time';
  import NoteContent from '@hyprgate/napplet-ui/NoteContent.svelte';
  import PersonButton from './PersonButton.svelte';

  interface Props {
    message: LiveChatMessage;
    profile?: ProfileContent;
    now: number;
    /** The same person said the line above, so don't repeat who they are. */
    continued?: boolean;
    onperson?: (pubkey: string) => void;
  }

  let { message, profile, now, continued = false, onperson }: Props = $props();
</script>

<div class="line hover:bg-bg-surface/40" class:continued class:own={message.isOwn} data-chat-line>
  {#if !continued}
    <div class="line-head">
      <PersonButton pubkey={message.pubkey} {profile} onopen={onperson} />
      {#if message.isOwn}
        <span class="own-tag">You</span>
      {/if}
      <!-- Time-ago (req 12); full datetime on hover. -->
      <span class="stamp" title={fullTimestamp(message.createdAt)}>{timeAgo(message.createdAt, now)}</span>
    </div>
  {/if}
  <div class="line-body text-sm whitespace-pre-wrap break-words text-text-primary">
    <NoteContent content={message.content} emojiTags={message.tags} />
  </div>
</div>

<style>
  .line {
    padding: 8px 12px 0 12px;
    border-left: 2px solid transparent;
  }

  .line.continued {
    padding-top: 2px;
  }

  .line.own {
    border-left-color: var(--hg-accent-green, #70f0a0);
  }

  .line-head {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .line-body {
    padding-left: 32px;
    line-height: 1.4;
  }

  .own-tag,
  .stamp {
    flex: none;
    font-size: 11px;
    color: var(--hg-text-muted, #b8b1a4);
  }

  .stamp {
    opacity: 0.8;
  }
</style>
