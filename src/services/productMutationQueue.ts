type SendProductState = (productId: string, isActive: boolean) => Promise<void>;

interface PendingMutation {
  desired: boolean;
  confirmed: boolean;
  processing: boolean;
  waiters: Array<{ resolve: () => void; reject: (error: unknown) => void }>;
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 250;

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

async function sendWithRetry(send: SendProductState, productId: string, isActive: boolean) {
  let attempt = 0;
  while (true) {
    try {
      await send(productId, isActive);
      return;
    } catch (error) {
      if (attempt >= MAX_RETRIES) throw error;
      await sleep(RETRY_DELAY_MS * 2 ** attempt);
      attempt += 1;
    }
  }
}

/** Cola coalescente: una mutación en vuelo por producto, sin bloquear otros productos. */
export class ProductMutationQueue {
  private readonly pending = new Map<string, PendingMutation>();

  enqueue(productId: string, desired: boolean, send: SendProductState): Promise<void> {
    const current = this.pending.get(productId);
    if (current) {
      current.desired = desired;
      return new Promise<void>((resolve, reject) => current.waiters.push({ resolve, reject }));
    }

    const entry: PendingMutation = {
      desired,
      confirmed: !desired,
      processing: false,
      waiters: [],
    };
    this.pending.set(productId, entry);
    const promise = new Promise<void>((resolve, reject) => entry.waiters.push({ resolve, reject }));
    void this.process(productId, entry, send);
    return promise;
  }

  private async process(productId: string, entry: PendingMutation, send: SendProductState) {
    if (entry.processing) return;
    entry.processing = true;
    try {
      while (entry.desired !== entry.confirmed) {
        const target = entry.desired;
        await sendWithRetry(send, productId, target);
        entry.confirmed = target;
      }
      entry.waiters.splice(0).forEach(({ resolve }) => resolve());
    } catch (error) {
      entry.waiters.splice(0).forEach(({ reject }) => reject(error));
    } finally {
      this.pending.delete(productId);
    }
  }
}
