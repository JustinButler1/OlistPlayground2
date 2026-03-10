type QueueItem = () => Promise<void>;
const queue: QueueItem[] = [];
let isProcessing = false;

export async function enqueueJikan<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    queue.push(async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (e) {
        reject(e);
      }
    });
    if (!isProcessing) {
      processQueue();
    }
  });
}

async function processQueue() {
  isProcessing = true;
  while (queue.length > 0) {
    const fn = queue.shift();
    if (fn) {
      await fn();
      await new Promise(r => setTimeout(r, 400));
    }
  }
  isProcessing = false;
}
