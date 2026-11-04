let snapPromise: Promise<void> | null = null;

export interface WindowWithSnap extends Window {
  snap?: {
    pay: (token: string, options?: any) => void;
    [key: string]: any;
  };
}

function getWindow(): WindowWithSnap {
  return typeof window !== 'undefined' ? (window as WindowWithSnap) : ({} as WindowWithSnap);
}

export function loadSnap(clientKey: string): Promise<void> {
  if (snapPromise) return snapPromise;

  const win = getWindow();
  if (win.snap) {
    snapPromise = Promise.resolve();
    return snapPromise;
  }

  snapPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://app.sandbox.midtrans.com/snap/snap.js';
    script.dataset.clientKey = clientKey;
    script.async = true;

    script.onload = () => {
      resolve();
    };

    script.onerror = () => {
      snapPromise = null;
      reject(new Error('Gagal memuat skrip Midtrans Snap'));
    };

    document.head.appendChild(script);
  });

  return snapPromise;
}

export function isSnapReady(): boolean {
  const win = getWindow();
  return !!win.snap;
}
