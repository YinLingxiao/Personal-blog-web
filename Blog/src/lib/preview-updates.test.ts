import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PreviewUpdates } from './preview-updates';

describe('editor preview updates', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders the latest text within 120ms even while typing continues', () => {
    const commit = vi.fn();
    const updates = new PreviewUpdates(commit);
    updates.schedule('a', false);
    vi.advanceTimersByTime(40);
    updates.schedule('ab', false);
    vi.advanceTimersByTime(40);
    updates.schedule('abc', false);
    vi.advanceTimersByTime(40);
    expect(commit).toHaveBeenCalledExactlyOnceWith('abc');
    updates.schedule('abcd', false);
    vi.advanceTimersByTime(120);
    expect(commit).toHaveBeenLastCalledWith('abcd');
  });

  it('cancels stale previews during IME composition and commits the final Chinese text afterwards', () => {
    const commit = vi.fn();
    const updates = new PreviewUpdates(commit);
    updates.schedule('原文', false);
    vi.advanceTimersByTime(20);
    updates.schedule('原文zh', true);
    vi.advanceTimersByTime(500);
    updates.schedule('原文中文', true);
    vi.advanceTimersByTime(500);
    expect(commit).not.toHaveBeenCalled();
    updates.schedule('原文中文', false);
    vi.advanceTimersByTime(120);
    expect(commit).toHaveBeenCalledExactlyOnceWith('原文中文');
  });

  it('cancels unmounted work and can restart after effect cleanup', () => {
    const commit = vi.fn();
    const updates = new PreviewUpdates(commit);
    updates.schedule('discarded', false);
    updates.clear();
    vi.advanceTimersByTime(120);
    expect(commit).not.toHaveBeenCalled();
    updates.schedule('new mount', false);
    vi.advanceTimersByTime(120);
    expect(commit).toHaveBeenCalledExactlyOnceWith('new mount');
  });
});
