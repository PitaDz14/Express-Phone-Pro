
'use client';

/**
 * Utility for playing system sounds.
 */
export const playSystemSound = (type: 'success' | 'failure' | 'alert') => {
  const isEnabled = localStorage.getItem('setting_system_sounds') !== 'false';
  if (!isEnabled) return;

  let url = '';
  switch (type) {
    case 'success':
      url = 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3';
      break;
    case 'failure':
      url = 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3';
      break;
    case 'alert':
      url = 'https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3';
      break;
  }

  if (url) {
    const audio = new Audio(url);
    audio.play().catch(e => console.warn('Audio playback blocked by browser. User interaction required.'));
  }
};
