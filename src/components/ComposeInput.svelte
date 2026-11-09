<script lang="ts">
  import EmojiPicker from './EmojiPicker.svelte';

  interface Props {
    placeholder: string;
    /** Resolves true when the message went out, so a failed one stays in the box. */
    onsend: (content: string) => Promise<boolean> | boolean;
    /** Why this person can't chat. The composer gives way to this message. */
    unavailable?: string | null;
  }

  let { placeholder, onsend, unavailable = null }: Props = $props();

  let content = $state('');
  let sending = $state(false);
  let textareaEl: HTMLTextAreaElement | undefined = $state(undefined);
  let emojiOpen = $state(false);

  const MAX_LINES = 4;
  let hasContent = $derived(content.trim().length > 0);

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  async function handleSend() {
    const trimmed = content.trim();
    if (!trimmed || sending) return;
    sending = true;
    try {
      if (!(await onsend(trimmed))) return;
      content = '';
      if (textareaEl) textareaEl.style.height = 'auto';
    } finally {
      sending = false;
    }
  }

  function handleInput() {
    if (!textareaEl) return;
    textareaEl.style.height = 'auto';
    const maxHeight = 1.5 * MAX_LINES * 16;
    textareaEl.style.height = `${Math.min(textareaEl.scrollHeight, maxHeight)}px`;
  }

  function insertEmoji(emoji: string) {
    content = content + emoji;
    emojiOpen = false;
    textareaEl?.focus();
  }
</script>

{#if unavailable}
  <p class="m-0 px-3 py-3 border-t border-border-dim bg-bg-surface text-text-muted text-sm font-mono flex-shrink-0" data-chat-unavailable>
    {unavailable}
  </p>
{:else}
  <div class="relative flex items-end gap-2 px-3 py-2 border-t border-border-dim bg-bg-surface flex-shrink-0">
    {#if emojiOpen}
      <EmojiPicker onpick={insertEmoji} onclose={() => { emojiOpen = false; }} />
    {/if}

    <textarea
      bind:this={textareaEl}
      bind:value={content}
      {placeholder}
      aria-label={placeholder}
      rows="1"
      class="flex-1 bg-transparent text-text-primary text-sm font-mono placeholder-text-muted outline-none resize-none overflow-y-auto leading-normal py-1"
      style="max-height: calc(1.5rem * {MAX_LINES}); min-height: 1.75rem;"
      onkeydown={handleKeydown}
      oninput={handleInput}
    ></textarea>

    <!-- Emoji picker toggle (req 8) -->
    <button
      type="button"
      class="text-text-muted hover:text-text-primary cursor-pointer text-base flex-shrink-0 pb-1 transition-colors"
      onclick={() => { emojiOpen = !emojiOpen; }}
      title="Emoji"
      aria-label="Emoji picker"
      aria-expanded={emojiOpen}
    >
      😀
    </button>

    <button
      type="button"
      class="send text-sm font-mono flex-shrink-0"
      onclick={() => { void handleSend(); }}
      disabled={!hasContent || sending}
    >
      {sending ? 'Sending…' : 'Send'}
    </button>
  </div>
{/if}

<style>
  .send {
    padding: 3px 12px;
    color: var(--hg-text-primary, #f2efe7);
    background: color-mix(in srgb, var(--hg-accent-green, #70f0a0) 28%, transparent);
    border: 1px solid var(--hg-accent-green, #70f0a0);
    border-radius: 6px;
    cursor: pointer;
  }

  .send:disabled {
    color: var(--hg-text-muted, #b8b1a4);
    background: none;
    border-color: var(--hg-border-dim, #2a2a2a);
    cursor: default;
  }

  .send:focus-visible {
    outline: 2px solid var(--hg-accent-green, #70f0a0);
    outline-offset: 2px;
  }
</style>
