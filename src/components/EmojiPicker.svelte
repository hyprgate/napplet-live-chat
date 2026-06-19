<script lang="ts">
  // Lightweight in-house standard-emoji grid (no dependency). Inserts a glyph
  // into the compose box. Standard emoji only — custom emoji are out of scope.
  interface Props {
    onpick: (emoji: string) => void;
    onclose: () => void;
  }

  let { onpick, onclose }: Props = $props();

  const EMOJI = [
    '😀', '😂', '🤣', '😊', '😍', '😎', '🤔', '😅',
    '👍', '👎', '🙌', '👏', '🙏', '💪', '🔥', '✨',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '⚡', '🎉',
    '😱', '😭', '😡', '🤯', '🥳', '🫡', '👀', '💯',
    '🚀', '🌚', '🐸', '☕', '🍻', '🎸', '🎧', '📺',
  ];
</script>

<div
  class="absolute bottom-12 right-2 z-10 w-56 max-h-48 overflow-y-auto p-2 rounded border border-border-dim bg-bg-elevated shadow-lg grid grid-cols-8 gap-1"
  role="menu"
  tabindex="-1"
  onmouseleave={onclose}
>
  {#each EMOJI as emoji (emoji)}
    <button
      class="text-lg leading-none p-1 rounded hover:bg-bg-surface cursor-pointer"
      onclick={() => onpick(emoji)}
      title={emoji}
    >
      {emoji}
    </button>
  {/each}
</div>
