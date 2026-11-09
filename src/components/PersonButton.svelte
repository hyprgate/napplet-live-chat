<script lang="ts">
  import { pubkeyColorStyle, resourceImage } from '@hyprgate/utils';
  import type { ProfileContent } from '../lib/profile-metadata';
  import { displayName, npubFor } from '../lib/identity';

  interface Props {
    pubkey: string;
    profile?: ProfileContent;
    showAvatar?: boolean;
    onopen?: (pubkey: string) => void;
  }

  let { pubkey, profile, showAvatar = true, onopen }: Props = $props();

  let name = $derived(displayName(profile, pubkey));
  let initial = $derived(name.slice(0, 1).toUpperCase());
</script>

<button type="button" class="person" title={npubFor(pubkey)} onclick={() => onopen?.(pubkey)}>
  {#if showAvatar}
    <!-- Keep the fallback beneath the resource image so failed remote avatars stay useful. -->
    <span class="avatar bg-bg-surface" style={pubkeyColorStyle(pubkey)} aria-hidden="true">
      <span class="initial">{initial}</span>
      {#if profile?.picture}
        <img use:resourceImage={profile.picture} alt="" loading="lazy" />
      {/if}
    </span>
  {/if}
  <span class="person-name" style={pubkeyColorStyle(pubkey)}>{name}</span>
</button>

<style>
  .person {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    padding: 0;
    font: inherit;
    background: none;
    border: none;
    cursor: pointer;
  }

  .person:hover .person-name {
    text-decoration: underline;
  }

  .person:focus-visible {
    outline: 2px solid var(--hg-accent-green, #70f0a0);
    outline-offset: 2px;
    border-radius: 3px;
  }

  .avatar {
    display: grid;
    flex: none;
    width: 24px;
    height: 24px;
    overflow: hidden;
    border-radius: 50%;
  }

  .initial,
  .avatar img {
    grid-area: 1 / 1;
  }

  .initial {
    display: grid;
    place-items: center;
    font-size: 12px;
  }

  .avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .person-name {
    overflow: hidden;
    font-size: 12px;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
