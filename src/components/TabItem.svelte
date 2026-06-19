<script lang="ts">
  import type { LiveChatTab } from '../lib/types';

  interface Props {
    tab: LiveChatTab;
    active: boolean;
    onselect: () => void;
    onclose: () => void;
  }

  let { tab, active, onselect, onclose }: Props = $props();

  function handleClose(e: MouseEvent) {
    e.stopPropagation();
    onclose();
  }
</script>

<div
  class="group flex items-center gap-1 px-3 h-10 border-r border-border-dim cursor-pointer flex-shrink-0 max-w-48 transition-colors {active
    ? 'bg-bg-base text-text-primary'
    : 'bg-bg-surface text-text-dim hover:text-text-primary'}"
  onclick={onselect}
  role="tab"
  tabindex="0"
  aria-selected={active}
  onkeydown={(e) => { if (e.key === 'Enter') onselect(); }}
  title={tab.title}
>
  <span class="truncate text-sm font-mono">{tab.title}</span>
  {#if tab.unreadCount > 0 && !active}
    <span class="text-xs font-mono text-accent-green flex-shrink-0">{tab.unreadCount > 99 ? '99+' : tab.unreadCount}</span>
  {/if}
  <button
    class="ml-1 text-text-dim hover:text-accent-red cursor-pointer flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
    onclick={handleClose}
    title="Close"
    aria-label="Close tab"
  >
    ×
  </button>
</div>
