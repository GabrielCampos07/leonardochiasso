export const TEXTURE_LOAD_CONCURRENCY = 3;

export interface TextureJob {
  id: string;
  priority: number;
  run: () => Promise<void>;
}

/** Bounded queue so hanger photos stream in without saturating decode. */
export class TextureLoadQueue {
  private readonly pending: TextureJob[] = [];
  private active = 0;
  private closed = false;
  private scheduled = false;

  constructor(private readonly concurrency = TEXTURE_LOAD_CONCURRENCY) {}

  get pendingCount(): number {
    return this.pending.length;
  }

  get activeCount(): number {
    return this.active;
  }

  enqueue(job: TextureJob): void {
    if (this.closed) return;
    const existing = this.pending.findIndex((item) => item.id === job.id);
    if (existing >= 0) {
      this.pending[existing]!.priority = Math.min(this.pending[existing]!.priority, job.priority);
      this.pending[existing]!.run = job.run;
    } else {
      this.pending.push(job);
    }
    this.pending.sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
    if (this.scheduled) return;
    this.scheduled = true;
    queueMicrotask(() => {
      this.scheduled = false;
      this.pump();
    });
  }

  clear(): void {
    this.pending.length = 0;
  }

  dispose(): void {
    this.closed = true;
    this.clear();
  }

  private pump(): void {
    while (!this.closed && this.active < this.concurrency && this.pending.length) {
      const job = this.pending.shift()!;
      this.active += 1;
      void job.run().finally(() => {
        this.active -= 1;
        this.pump();
      });
    }
  }
}

export function texturePriority(rackId: string, focusedId: string, rackIndex: number, focusedIndex: number): number {
  if (rackId === focusedId) return 0;
  const distance = focusedIndex < 0 ? rackIndex : Math.abs(rackIndex - focusedIndex);
  return 1 + distance;
}
