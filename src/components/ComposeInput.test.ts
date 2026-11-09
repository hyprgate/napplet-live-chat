import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, tick, unmount } from 'svelte';
import ComposeInput from './ComposeInput.svelte';

const mounted: Array<ReturnType<typeof mount>> = [];

function mountComposer(onsend: (content: string) => Promise<boolean> | boolean, unavailable: string | null = null) {
  mounted.push(mount(ComposeInput, { target: document.body, props: { placeholder: 'Chat in Show…', onsend, unavailable } }));
  flushSync();
}

function type(text: string): HTMLTextAreaElement {
  const box = document.querySelector('textarea')!;
  box.value = text;
  box.dispatchEvent(new Event('input', { bubbles: true }));
  flushSync();
  return box;
}

function pressEnter(box: HTMLTextAreaElement): void {
  box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
}

afterEach(() => {
  for (const component of mounted.splice(0)) unmount(component);
  document.body.innerHTML = '';
});

describe('ComposeInput', () => {
  it('keeps the text when sending fails', async () => {
    const onsend = vi.fn().mockResolvedValue(false);
    mountComposer(onsend);
    const box = type('do not lose me');

    pressEnter(box);
    await vi.waitFor(() => expect(onsend).toHaveBeenCalledWith('do not lose me'));
    await tick();

    expect(box.value).toBe('do not lose me');
  });

  it('clears the text once a message goes out', async () => {
    const onsend = vi.fn().mockResolvedValue(true);
    mountComposer(onsend);
    const box = type('hello');

    document.querySelector<HTMLButtonElement>('.send')!.click();
    await vi.waitFor(() => expect(box.value).toBe(''));
  });

  it('sends once while a send is still going', async () => {
    let finish: (sent: boolean) => void = () => {};
    const onsend = vi.fn(() => new Promise<boolean>((resolve) => { finish = resolve; }));
    mountComposer(onsend);
    const box = type('hello');

    pressEnter(box);
    pressEnter(box);
    await tick();
    expect(onsend).toHaveBeenCalledTimes(1);
    finish(true);
  });

  it('keeps Shift+Enter as a new line and Send off while empty', () => {
    const onsend = vi.fn();
    mountComposer(onsend);
    const box = type('line');

    box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }));
    expect(onsend).not.toHaveBeenCalled();

    type('   ');
    expect(document.querySelector<HTMLButtonElement>('.send')!.disabled).toBe(true);
  });

  it('explains itself instead of offering a box when chatting is not possible', () => {
    mountComposer(vi.fn(), 'Sign in to join the chat.');

    expect(document.querySelector('textarea')).toBeNull();
    expect(document.querySelector('[data-chat-unavailable]')?.textContent).toContain('Sign in');
  });
});
