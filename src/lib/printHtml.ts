/**
 * Print a self-contained HTML document via a hidden iframe.
 *
 * This renders the given HTML in an isolated document and invokes the browser's
 * print dialog on THAT document — so the output is the formatted report, not a
 * screen capture of the current app UI. Works without popup permissions.
 */
export function printHtml(html: string): void {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const cleanup = () => {
    if (document.body.contains(iframe)) document.body.removeChild(iframe);
  };

  const doc = iframe.contentWindow?.document;
  if (!doc || !iframe.contentWindow) {
    cleanup();
    return;
  }

  const win = iframe.contentWindow;
  win.onafterprint = cleanup;

  const trigger = () => {
    try {
      win.focus();
      win.print();
    } finally {
      // Fallback cleanup in case onafterprint never fires (some browsers).
      setTimeout(cleanup, 60000);
    }
  };

  doc.open();
  doc.write(html);
  doc.close();

  // Give the document a tick to lay out (fonts/tables) before printing.
  if (doc.readyState === 'complete') {
    setTimeout(trigger, 100);
  } else {
    iframe.onload = () => setTimeout(trigger, 100);
  }
}

/** Escape text for safe interpolation into printed HTML. */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
