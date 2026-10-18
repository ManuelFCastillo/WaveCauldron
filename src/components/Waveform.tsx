import { useEffect, useRef } from 'react';

interface WaveformProps {
  samples: Float32Array;
  sampleRate: number;
  /** Re-draw when the skin changes (colours come from CSS variables). */
  theme: string;
}

export function Waveform({ samples, sampleRate, theme }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width === 0) return;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(dpr, dpr);

      const styles = getComputedStyle(canvas);
      const start = styles.getPropertyValue('--wave-start').trim() || '#f97316';
      const end = styles.getPropertyValue('--wave-end').trim() || '#6ee7b7';
      const grid = styles.getPropertyValue('--border').trim() || '#333';

      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, start);
      gradient.addColorStop(1, end);
      ctx.fillStyle = gradient;
      ctx.shadowColor = start;
      ctx.shadowBlur = 6;

      // Min/max per column so transients don't vanish when downsampling.
      const mid = height / 2;
      const perColumn = samples.length / width;
      for (let x = 0; x < width; x++) {
        const from = Math.floor(x * perColumn);
        const to = Math.min(samples.length, Math.floor((x + 1) * perColumn) + 1);
        let lo = 0;
        let hi = 0;
        for (let i = from; i < to; i++) {
          const v = samples[i];
          if (v < lo) lo = v;
          if (v > hi) hi = v;
        }
        const top = mid - hi * (mid - 4);
        const bottom = mid - lo * (mid - 4);
        ctx.fillRect(x, top, 1, Math.max(1, bottom - top));
      }
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [samples, theme]);

  const seconds = samples.length / sampleRate;
  return (
    <div className="waveform">
      <canvas ref={canvasRef} />
      <span className="waveform-meta">
        {seconds.toFixed(2)} s · {sampleRate / 1000} kHz · mono 16-bit
      </span>
    </div>
  );
}
