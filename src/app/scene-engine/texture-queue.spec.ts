import { TEXTURE_LOAD_CONCURRENCY, TextureLoadQueue, hangerPhotoPriority, texturePriority } from './texture-queue';

describe('TextureLoadQueue', () => {
  it('runs at most the concurrency limit and prefers lower priority', async () => {
    const seen: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const queue = new TextureLoadQueue(2);
    const job = (id: string, priority: number) =>
      queue.enqueue({
        id,
        priority,
        run: async () => {
          seen.push(id);
          await gate;
        },
      });
    job('far', 5);
    job('active', 0);
    job('next', 1);
    await Promise.resolve();
    expect(queue.activeCount).toBe(2);
    expect(seen).toEqual(['active', 'next']);
    release();
    await Promise.resolve();
    await Promise.resolve();
    expect(seen).toContain('far');
    queue.dispose();
  });

  it('cancels a pending job without starting it', async () => {
    const seen: string[] = [];
    const queue = new TextureLoadQueue(1);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    queue.enqueue({
      id: 'busy',
      priority: 0,
      run: async () => {
        seen.push('busy');
        await gate;
      },
    });
    queue.enqueue({
      id: 'drop',
      priority: 1,
      run: async () => {
        seen.push('drop');
      },
    });
    await Promise.resolve();
    queue.cancel('drop');
    release();
    await Promise.resolve();
    await Promise.resolve();
    expect(seen).toEqual(['busy']);
    queue.dispose();
  });
});

describe('texturePriority', () => {
  it('ranks the focused rack first', () => {
    expect(texturePriority('a', 'a', 0, 0)).toBe(0);
    expect(texturePriority('b', 'a', 1, 0)).toBe(2);
    expect(texturePriority('c', 'a', 2, 0)).toBe(3);
  });
});

describe('hangerPhotoPriority', () => {
  it('queues hangers nearest the framed column first', () => {
    expect(TEXTURE_LOAD_CONCURRENCY).toBeGreaterThanOrEqual(6);
    expect(TEXTURE_LOAD_CONCURRENCY).toBeLessThanOrEqual(8);
    expect(hangerPhotoPriority('a', 'a', 0, 0, 0, { hangerCount: 8, focusColumn: 0 })).toBe(0);
    expect(hangerPhotoPriority('a', 'a', 0, 0, 3, { hangerCount: 8, focusColumn: 0 })).toBe(3);
    expect(hangerPhotoPriority('a', 'a', 0, 0, 3, { hangerCount: 8, focusColumn: 3 })).toBe(0);
    expect(hangerPhotoPriority('b', 'a', 1, 0, 0, { hangerCount: 8 })).toBeGreaterThan(
      hangerPhotoPriority('a', 'a', 0, 0, 7, { hangerCount: 8 }),
    );
  });
});
