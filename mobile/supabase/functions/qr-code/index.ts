// ---------------------------------------------------------------------------
// qr-code Edge Function
// Renders a shop's QR code as a PNG. Public (no auth) because email clients
// fetch it as a plain <img src="...">, and it exposes nothing secret — just
// a link to a public shop page.
//
// Deploy:  supabase functions deploy qr-code --no-verify-jwt
// Use:     https://<project>.supabase.co/functions/v1/qr-code?shop=<uuid>
// ---------------------------------------------------------------------------
import QRCode from 'npm:qrcode@1.5.4';

const SCAN_BASE_URL = 'https://localpulse.app/s';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const shop = url.searchParams.get('shop') ?? '';

  // Only ever encode a shop id we generated. Never echo arbitrary input
  // into a scannable code.
  if (!UUID_RE.test(shop)) {
    return new Response('Invalid shop id', { status: 400 });
  }

  const size = Math.min(Math.max(Number(url.searchParams.get('size') ?? 512), 128), 2048);

  try {
    const dataUrl: string = await QRCode.toDataURL(`${SCAN_BASE_URL}/${shop}`, {
      width: size,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#171B1A', light: '#FFFFFF' },
    });
    const base64 = dataUrl.split(',')[1];
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

    return new Response(bytes, {
      headers: {
        'Content-Type': 'image/png',
        // Immutable per shop — let email clients and CDNs cache hard.
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (e) {
    return new Response(`QR generation failed: ${e}`, { status: 500 });
  }
});
