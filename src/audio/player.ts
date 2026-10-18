/**
 * Thin Web Audio wrapper: plays a rendered Float32Array. The AudioContext is
 * created lazily on the first play so browsers' autoplay rules are satisfied.
 */
let context: AudioContext | null = null;
let current: AudioBufferSourceNode | null = null;

function getContext(): AudioContext {
  if (!context) context = new AudioContext();
  if (context.state === 'suspended') void context.resume();
  return context;
}

export function playSamples(samples: Float32Array, sampleRate: number): void {
  const ctx = getContext();
  stopPlayback();
  const buffer = ctx.createBuffer(1, samples.length, sampleRate);
  buffer.copyToChannel(samples as Float32Array<ArrayBuffer>, 0);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.onended = () => {
    if (current === source) current = null;
  };
  source.start();
  current = source;
}

export function stopPlayback(): void {
  if (current) {
    try {
      current.stop();
    } catch {
      // Already stopped.
    }
    current = null;
  }
}
