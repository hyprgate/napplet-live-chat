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
  class="group flex items-center gap-1 px-3 h-10 border-r border-border-dim cursor-pointer flex-shrink-0 max-w-64 transition-colors {active
    ? 'bg-bg-base text-text-primary tab-active'
    : 'bg-bg-surface text-text-muted hover:text-text-primary'}"
  onclick={onselect}
  role="tab"
  tabindex="0"
  aria-selected={active}
  onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onselect(); } }}
  title={tab.title}
>
  <span class="truncate text-sm font-mono">{tab.title}</span>
  {#if tab.unreadCount > 0 && !active}
    <span class="unread" aria-label="{tab.unreadCount} unread">{tab.unreadCount > 99 ? '99+' : tab.unreadCount}</span>
  {/if}
  <button
    type="button"
    class="ml-1 text-text-muted hover:text-accent-red cursor-pointer flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
    onclick={handleClose}
    title="Close"
    aria-label={`Close ${tab.title}`}
  >
    ×
  </button>
</div>

<style>
  .tab-active {
    box-shadow: inset 0 -2px 0 var(--hg-accent-green, #70f0a0);
  }

  .unread {
    flex: none;
    min-width: 18px;
    padding: 0 5px;
    font-size: 11px;
    line-height: 18px;
    text-align: center;
    color: var(--hg-bg-base, #050505);
    background: var(--hg-accent-green, #70f0a0);
    border-radius: 999px;
  }
</style>
