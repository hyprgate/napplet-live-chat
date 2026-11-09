import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, tick, unmount } from 'svelte';
import MessageList from './MessageList.svelte';
import type { LiveChatMessage } from '../lib/types';

vi.mock('@hyprgate/utils', () => ({
  pubkeyColorStyle: () => '',
  resourceImage: () => ({ update() {}, destroy() {} }),
}));
vi.mock('@hyprgate/napplet-ui/NoteContent.svelte', async () => import('./EmptyState.svelte'));

const ALICE = 'a'.repeat(64);
const BOB = 'b'.repeat(64);

function line(id: string, pubkey: string, createdAt: number): LiveChatMessage {
  return { id, pubkey, content: id, tags: [], createdAt, isOwn: false, kind: 'chat' };
}

let component: ReturnType<typeof mount> | null = null;

function mountList(messages: LiveChatMessage[], onperson = vi.fn()) {
  const props = { messages, profiles: new Map(), now: 2_000_000, onperson };
  component = mount(MessageList, { target: document.body, props });
  flushSync();
  return props;
}


/** jsdom has no layout, so give the scroller the numbers a browser would. */
function layOut(scroller: HTMLElement, scrollHeight: number, clientHeight: number, scrollTop: number): void {
  Object.defineProperty(scroller, 'scrollHeight', { configurable: true, value: scrollHeight });
  Object.defineProperty(scroller, 'clientHeight', { configurable: true, value: clientHeight });
  scroller.scrollTop = scrollTop;
}

afterEach(() => {
  if (component) unmount(component);
  component = null;
  document.body.innerHTML = '';
});

describe('MessageList', () => {
  it('only names a person once for a run of their messages', async () => {
    mountList([line('one', ALICE, 1000), line('two', ALICE, 1100), line('three', BOB, 1200)]);
    await tick();

    expect(document.querySelectorAll('[data-chat-line]')).toHaveLength(3);
    expect(document.querySelectorAll('.person')).toHaveLength(2);
  });

  it('opens the person whose name is clicked', async () => {
    const onperson = vi.fn();
    mountList([line('one', ALICE, 1000)], onperson);
    await tick();

    document.querySelector<HTMLElement>('.person')!.click();

    expect(onperson).toHaveBeenCalledWith(ALICE);
  });

  it('offers a way back after scrolling up, and returns to the newest line', async () => {
    mountList([line('one', ALICE, 1000), line('two', BOB, 1100)]);
    await tick();
    const scroller = document.querySelector<HTMLElement>('[data-chat-scroller]')!;
    expect(document.querySelector('.jump')).toBeNull();

    layOut(scroller, 1000, 300, 100);
    scroller.dispatchEvent(new Event('scroll'));
    flushSync();

    const jump = document.querySelector<HTMLButtonElement>('.jump')!;
    expect(jump.textContent).toContain('Jump to latest');

    jump.click();
    flushSync();

    expect(scroller.scrollTop).toBe(1000);
    expect(document.querySelector('.jump')).toBeNull();
  });
});
