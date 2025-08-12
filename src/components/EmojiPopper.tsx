import React, { useEffect } from 'react';

type Props = {
  /** Where clicks should trigger emojis (CSS selector). Default: 'body' */
  selector?: string;
  /** Emoji set to pick from. */
  emojis?: string[];
  /** CSS size for the emoji. Example: '5rem'. Default: '5rem' */
  size?: string;
  /** Animation duration in ms. Default: 800 */
  durationMs?: number;
};

const DEFAULT_EMOJIS = ['😀','😂','🎉','❤️','👍','🔥','😎','🥳','🚀','✨'];

export default function EmojiPopper({
  selector = 'body',
  emojis = DEFAULT_EMOJIS,
  size = '15rem',
  durationMs = 400,
}: Props) {
  useEffect(() => {
    // Inject the CSS once
    const STYLE_ID = 'emoji-popper-style';
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
        @keyframes emoji-pop-up {
          0%   { transform: translate(-50%, -50%) scale(1);    opacity: 1; }
          50%  { transform: translate(-50%, -120%) scale(1.5); opacity: 1; }
          100% { transform: translate(-50%, -180%) scale(0.5); opacity: 0; }
        }
        .emoji-pop {
          user-select:none;
          position: fixed;
          left: 0;
          top: 0;
          transform: translate(-50%, -50%);
          pointer-events: none;
          z-index: 9999;
          will-change: transform, opacity;
          animation: emoji-pop-up var(--emoji-pop-duration, 800ms) ease-out forwards;
        }
      `;
      document.head.appendChild(style);
    }

    const container = document.querySelector(selector) as HTMLElement | null;
    if (!container) return;

    const onClick = (e: MouseEvent) => {
      // Create the floating emoji
      const el = document.createElement('div');
      el.className = 'emoji-pop';
      el.textContent = emojis[(Math.random() * emojis.length) | 0];
      el.style.left = `${e.clientX}px`; // viewport coordinates (position: fixed)
      el.style.top = `${e.clientY}px`;
      el.style.fontSize = size;
      el.style.setProperty('--emoji-pop-duration', `${durationMs}ms`);

      document.body.appendChild(el);
      el.addEventListener('animationend', () => el.remove(), { once: true });
    };

    container.addEventListener('click', onClick);
    return () => container.removeEventListener('click', onClick);
  }, [selector, emojis, size, durationMs]);

  return null;
}
