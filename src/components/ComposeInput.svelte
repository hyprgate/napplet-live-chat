<script lang="ts">
  import EmojiPicker from './EmojiPicker.svelte';

  interface Props {
    placeholder: string;
    onsend: (content: string) => void;
  }

  let { placeholder, onsend }: Props = $props();

  let content = $state('');
  let textareaEl: HTMLTextAreaElement | undefined = $state(undefined);
  let emojiOpen = $state(false);

  const MAX_LINES = 4;
  let hasContent = $derived(content.trim().length > 0);

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSend() {
    const trimmed = content.trim();
    if (!trimmed) return;
    onsend(trimmed);
    content = '';
    if (textareaEl) textareaEl.style.height = 'auto';
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

<div class="relative flex items-end gap-2 px-3 py-2 border-t border-border-dim bg-bg-surface flex-shrink-0">
  {#if emojiOpen}
    <EmojiPicker onpick={insertEmoji} onclose={() => { emojiOpen = false; }} />
  {/if}

  <textarea
    bind:this={textareaEl}
    bind:value={content}
    {placeholder}
    rows="1"
    class="flex-1 bg-transparent text-text-primary text-sm font-mono placeholder-text-dim outline-none resize-none overflow-y-auto leading-normal py-1"
    style="max-height: calc(1.5rem * {MAX_LINES}); min-height: 1.75rem;"
    onkeydown={handleKeydown}
    oninput={handleInput}
  ></textarea>

  <!-- Emoji picker toggle (req 8) -->
  <button
    class="text-text-dim hover:text-text-primary cursor-pointer text-base flex-shrink-0 pb-1 transition-colors"
    onclick={() => { emojiOpen = !emojiOpen; }}
    title="Emoji"
    aria-label="Emoji picker"
  >
    😀
  </button>

  <!-- Zap button present but disabled until NAP-PAY (#5), req 9 -->
  <button
    class="text-text-dim cursor-not-allowed text-base flex-shrink-0 pb-1 opacity-50"
    disabled
    title="Zap — coming soon"
    aria-label="Zap (coming soon)"
  >
    ⚡
  </button>

  {#if hasContent}
    <button
      class="text-accent-green hover:text-text-primary cursor-pointer text-sm font-mono flex-shrink-0 pb-1 transition-colors"
      onclick={handleSend}
      title="Send"
    >
      &gt;
    </button>
  {/if}
</div>
