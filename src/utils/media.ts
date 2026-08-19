/**
 * Media embedding and coupled window utilities for SYNAPSE
 */

export function extractEmbedUrl(rawUrl: string | undefined | null, defaultPartnerId = '2608811'): string | null {
  if (!rawUrl) return null;
  const u = rawUrl.trim();
  if (!u) return null;

  // YouTube Shorts
  if (u.includes('youtube.com/shorts/')) {
    const parts = u.split('youtube.com/shorts/')[1];
    const id = parts ? parts.split(/[?&]/)[0] : null;
    if (id) return `https://www.youtube.com/embed/${id}?rel=0`;
  }

  // YouTube standard watch
  if (u.includes('youtube.com/watch?v=')) {
    const id = u.split('watch?v=')[1]?.split('&')[0];
    if (id) return `https://www.youtube.com/embed/${id}?rel=0`;
  }

  // YouTube short link
  if (u.includes('youtu.be/')) {
    const id = u.split('youtu.be/')[1]?.split(/[?&]/)[0];
    if (id) return `https://www.youtube.com/embed/${id}?rel=0`;
  }

  // Google Drive preview (/file/d/ID or /open?id=ID)
  if (u.includes('drive.google.com/file/d/')) {
    const match = u.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/file/d/${match[1]}/preview`;
    }
  }
  if (u.includes('drive.google.com/open?id=')) {
    const id = u.split('open?id=')[1]?.split('&')[0];
    if (id) return `https://drive.google.com/file/d/${id}/preview`;
  }

  // Vimeo
  const vm = u.match(/vimeo\.com\/(\d+)/);
  if (vm && vm[1]) {
    return `https://player.vimeo.com/video/${vm[1]}`;
  }

  // Kaltura / Focus (entry_id in query or path)
  const ke = u.match(/entry_id[=/]([0-9_][a-zA-Z0-9_]+)/i) || u.match(/\/entry\/([0-9_][a-zA-Z0-9_]+)/i);
  if (ke && ke[1]) {
    return `https://cdnapisec.kaltura.com/index.php/extwidget/preview/partner_id/${defaultPartnerId}/entry_id/${ke[1]}/embed/dynamic`;
  }

  // Direct Kaltura URL
  if (u.includes('cdnapisec.kaltura.com') && u.includes('entry_id')) {
    return u;
  }

  return null; // External site blocks iframe embedding or is unknown
}

let coupledWindowRef: Window | null = null;

export function calculateDockingPosition() {
  const availW = typeof window !== 'undefined' && window.screen ? window.screen.availWidth : 1920;
  const availH = typeof window !== 'undefined' && window.screen ? window.screen.availHeight : 1080;

  const winX = typeof window !== 'undefined' && window.screenX !== undefined ? window.screenX : 0;
  const winY = typeof window !== 'undefined' && window.screenY !== undefined ? window.screenY : 0;
  const winW = typeof window !== 'undefined' ? (window.outerWidth || window.innerWidth || 1024) : 1024;
  const winH = typeof window !== 'undefined' ? (window.outerHeight || window.innerHeight || 768) : 768;

  // Target width: 45-50% of available width, capped between 480px and 720px
  const targetW = Math.max(480, Math.min(720, Math.floor(availW * 0.48)));
  const targetH = Math.max(500, winH);
  const targetTop = Math.max(0, winY);

  // 1. Default: Dock right of SYNAPSE window
  let targetLeft = winX + winW;

  // 2. Clamping: If overflows right edge of available screen
  if (targetLeft + targetW > availW) {
    // Try docking left of SYNAPSE window
    targetLeft = winX - targetW;
  }

  // 3. Clamping: If overflows left edge as well (screen too small or SYNAPSE maximized)
  if (targetLeft < 0) {
    // Center over SYNAPSE window as fallback
    targetLeft = Math.max(0, winX + Math.floor((winW - targetW) / 2));
  }

  return {
    left: Math.round(targetLeft),
    top: Math.round(targetTop),
    width: Math.round(targetW),
    height: Math.round(targetH),
  };
}

export function openCoupledWindow(url: string): boolean {
  if (!url) return false;

  const pos = calculateDockingPosition();
  const features = `popup=yes,width=${pos.width},height=${pos.height},left=${pos.left},top=${pos.top}`;

  if (coupledWindowRef && !coupledWindowRef.closed) {
    try {
      coupledWindowRef.location.href = url;
      coupledWindowRef.moveTo(pos.left, pos.top);
      coupledWindowRef.resizeTo(pos.width, pos.height);
      coupledWindowRef.focus();
      return true;
    } catch (e) {
      console.warn('[CoupledWindow] Re-opening window:', e);
    }
  }

  try {
    coupledWindowRef = window.open(url, 'synapse_media_window', features);
    if (coupledWindowRef) {
      coupledWindowRef.focus();
      return true;
    }
  } catch (err) {
    console.error('[CoupledWindow] Failed to open:', err);
  }

  return false;
}

export function redockCoupledWindow(): boolean {
  const pos = calculateDockingPosition();
  if (coupledWindowRef && !coupledWindowRef.closed) {
    try {
      coupledWindowRef.moveTo(pos.left, pos.top);
      coupledWindowRef.resizeTo(pos.width, pos.height);
      coupledWindowRef.focus();
      return true;
    } catch (e) {
      console.warn('[CoupledWindow] Redock error:', e);
    }
  }
  return false;
}

export function isCoupledWindowOpen(): boolean {
  return !!(coupledWindowRef && !coupledWindowRef.closed);
}

export function toggleCoupledWindowFocus(): boolean {
  if (coupledWindowRef && !coupledWindowRef.closed) {
    try {
      if (document.hasFocus()) {
        coupledWindowRef.focus();
      } else {
        window.focus();
      }
      return true;
    } catch (e) {
      console.warn('[CoupledWindow] Toggle focus error:', e);
    }
  }
  return false;
}

// Global hotkey listener: Ctrl+Shift+F or Cmd+Shift+F to toggle focus
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      toggleCoupledWindowFocus();
    }
  });

  (window as any).extractEmbedUrl = extractEmbedUrl;
  (window as any).openCoupledWindow = (url: string) => {
    const opened = openCoupledWindow(url);
    if (!opened && (window as any).showToast) {
      (window as any).showToast('Permita pop-ups para abrir em janela acoplada.', 'warning');
    }
    return opened;
  };
  (window as any).redockCoupledWindow = redockCoupledWindow;
  (window as any).isCoupledWindowOpen = isCoupledWindowOpen;
}
