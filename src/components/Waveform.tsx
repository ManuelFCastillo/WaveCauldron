import { useEffect, useRef } from 'react';

interface WaveformProps {
  samples: Float32Array;
  sampleRate: number;
}

export function Waveform({ samples, sampleRate }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const styles = getComputedStyle(canvas);
    const accent = styles.getPropertyValue('--accent').trim() || '#6ee7b7';
    const grid = styles.getPropertyValue('--border').trim() || '#333';

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Min/max per column so transients don't vanish when downsampling.
    const mid = height / 2;
    const perColumn = samples.length / width;
    ctx.fillStyle = accent;
    for (let x = 0; x < width; x++) {
      const start = Math.floor(x * perColumn);
      const end = Math.min(samples.length, Math.floor((x + 1) * perColumn) + 1);
      let lo = 0;
      let hi = 0;
      for (let i = start; i < end; i++) {
        const v = samples[i];
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
      const top = mid - hi * mid;
      const bottom = mid - lo * mid;
      ctx.fillRect(x, top, 1, Math.max(1, bottom - top));
    }
  }, [samples]);

  const seconds = samples.length / sampleRate;
  return (
    <div className="waveform">
      <canvas ref={canvasRef} />
      <span className="waveform-meta">
        {seconds.toFixed(2)} s · {sampleRate} Hz · mono 16-bit
      </span>
    </div>
  );
}
