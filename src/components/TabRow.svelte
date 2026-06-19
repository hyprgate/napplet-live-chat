<script lang="ts">
  import type { LiveChatTab } from '../lib/types';
  import TabItem from './TabItem.svelte';

  interface Props {
    tabs: LiveChatTab[];
    activeTabId: string | null;
    onselecttab: (tabId: string) => void;
    onclosetab: (tabId: string) => void;
  }

  let { tabs, activeTabId, onselecttab, onclosetab }: Props = $props();
</script>

<!-- Horizontal, scrollable strip of open stream-chat tabs. New tabs are prepended
     (newest stream first) by the store on channel switch. -->
<div class="flex items-stretch h-10 border-b border-border-dim bg-bg-surface flex-shrink-0 overflow-x-auto scrollbar-none">
  {#each tabs as tab (tab.id)}
    <TabItem
      {tab}
      active={tab.id === activeTabId}
      onselect={() => onselecttab(tab.id)}
      onclose={() => onclosetab(tab.id)}
    />
  {/each}
</div>
