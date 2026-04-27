import { useEffect, useRef, useState } from 'react';

interface SlideshowProps {
  urls: string[];
  alt: string;
  className?: string;
}

export function Slideshow({ urls, alt, className }: SlideshowProps) {
  const [current, setCurrent] = useState(0);
  const paused = useRef(false);
  const list = urls.length ? urls : [];

  useEffect(() => {
    setCurrent(0);
  }, [urls]);

  useEffect(() => {
    if (list.length <= 1) return;
    const t = setInterval(() => {
      if (!paused.current) {
        setCurrent(i => (i + 1) % list.length);
      }
    }, 3500);
    return () => clearInterval(t);
  }, [list.length]);

  if (!list.length) return null;

  return (
    <div
      className={className}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}
      onMouseEnter={() => { paused.current = true; }}
      onMouseLeave={() => { paused.current = false; }}
    >
      {/* Sliding strip */}
      <div
        style={{
          display: 'flex',
          width: `${list.length * 100}%`,
          height: '100%',
          transform: `translateX(-${(current / list.length) * 100}%)`,
          transition: 'transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)',
          willChange: 'transform',
        }}
      >
        {list.map((url, i) => (
          <div
            key={i}
            style={{ width: `${100 / list.length}%`, height: '100%', flexShrink: 0 }}
          >
            <img
              src={url}
              alt={`${alt} ${i + 1}`}
              draggable={false}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      {list.length > 1 && (
        <div className="slideshow-dots">
          {list.map((_, i) => (
            <button
              key={i}
              className={`slideshow-dot${i === current ? ' active' : ''}`}
              onClick={(e) => { e.preventDefault(); setCurrent(i); }}
              aria-label={`Photo ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
