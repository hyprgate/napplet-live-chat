import * as nip19 from 'nostr-tools/nip19';
import type { ProfileContent } from './profile-metadata';
import type { LiveChatMessage } from './types';

export function npubFor(pubkey: string): string {
  try {
    return nip19.npubEncode(pubkey);
  } catch {
    return pubkey;
  }
}

/** Keeps both ends of the npub so two people with no profile stay tellable apart. */
export function shortNpub(pubkey: string): string {
  const npub = npubFor(pubkey);
  return npub.length > 20 ? `${npub.slice(0, 12)}…${npub.slice(-6)}` : npub;
}

export function displayName(profile: ProfileContent | undefined, pubkey: string): string {
  return profile?.display_name?.trim() || profile?.name?.trim() || shortNpub(pubkey);
}

const GROUP_WINDOW_SECONDS = 5 * 60;

/** A chat line continues the one above when the same person said it moments later. */
export function continuesPrevious(message: LiveChatMessage, previous: LiveChatMessage | undefined): boolean {
  return Boolean(previous)
    && message.kind === 'chat'
    && previous!.kind === 'chat'
    && previous!.pubkey === message.pubkey
    && message.createdAt - previous!.createdAt <= GROUP_WINDOW_SECONDS;
}

/** The composer keeps the text, so this only has to say what went wrong. */
export function sendFailureMessage(reason: string): string {
  if (/read-?only/i.test(reason)) return "Your session is read-only, so this didn't send. Sign in with a key to chat.";
  return reason ? `Your message didn't send: ${reason}` : "Your message didn't send.";
}
