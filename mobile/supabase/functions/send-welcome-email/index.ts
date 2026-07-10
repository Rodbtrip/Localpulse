// ---------------------------------------------------------------------------
// send-welcome-email Edge Function
// Sends the "Welcome aboard" email to a newly-created business owner,
// including their printable QR code and referral link.
//
// Deploy:
//   supabase secrets set RESEND_API_KEY=re_xxx
//   supabase secrets set PUBLIC_FUNCTIONS_URL=https://<project>.supabase.co/functions/v1
//   supabase functions deploy send-welcome-email
//
// Idempotent: if the shop already has welcome_email_sent_at, it no-ops.
// Requires a nullable timestamptz column on `shops`:
//   alter table shops add column if not exists welcome_email_sent_at timestamptz;
// ---------------------------------------------------------------------------
import { createClient } from 'npm:@supabase/supabase-js@2';

const FROM = 'LocalPulse <hello@localpulse.com>';

Deno.serve(async (req) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
  };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Not signed in.' }, 401);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: shop } = await admin
      .from('shops')
      .select('id, name, referral_code, welcome_email_sent_at')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (!shop) return json({ error: 'No business found for this account.' }, 400);
    if (shop.welcome_email_sent_at) return json({ success: true, skipped: 'already sent' });

    const apiKey = Deno.env.get('RESEND_API_KEY');
    if (!apiKey) return json({ error: 'Email is not configured.' }, 500);

    const fnBase = Deno.env.get('PUBLIC_FUNCTIONS_URL') ?? '';
    const qrUrl = `${fnBase}/qr-code?shop=${shop.id}&size=600`;
    const scanUrl = `https://localpulse.app/s/${shop.id}`;
    const referralUrl = shop.referral_code
      ? `https://localpulse.app/sign-up?ref=${shop.referral_code}`
      : 'https://localpulse.app/sign-up';

    const html = welcomeHtml({ shopName: shop.name, qrUrl, scanUrl, referralUrl });

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: [user.email],
        subject: `Welcome aboard, ${shop.name}`,
        html,
      }),
    });

    if (!res.ok) return json({ error: `Email provider error: ${await res.text()}` }, 502);

    await admin.from('shops').update({ welcome_email_sent_at: new Date().toISOString() }).eq('id', shop.id);
    return json({ success: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function welcomeHtml(o: { shopName: string; qrUrl: string; scanUrl: string; referralUrl: string }) {
  // Table-based, inline styles: the only layout email clients agree on.
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#FAF7F2;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF7F2;padding:32px 16px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid #E7E3DB;border-radius:6px;">
    <tr><td style="padding:32px 32px 8px;font-family:Helvetica,Arial,sans-serif;">
      <p style="margin:0 0 6px;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#F2542D;font-weight:700;">Welcome aboard</p>
      <h1 style="margin:0 0 12px;font-size:26px;line-height:1.25;color:#171B1A;">${escapeHtml(o.shopName)} is on LocalPulse.</h1>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:rgba(23,27,26,0.75);">
        You're set up. Publish your first promotion, set a contest prize, and let your customers tell you what deal would actually bring them in.
      </p>
    </td></tr>

    <tr><td style="padding:8px 32px 24px;font-family:Helvetica,Arial,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(242,84,45,0.05);border:1px solid rgba(242,84,45,0.3);border-radius:5px;">
        <tr><td align="center" style="padding:24px;">
          <p style="margin:0 0 4px;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#F2542D;font-weight:700;">Your customer QR code</p>
          <p style="margin:0 0 16px;font-size:14px;color:rgba(23,27,26,0.7);">Print it. Tape it by the register.</p>
          <img src="${o.qrUrl}" width="220" height="220" alt="Scan for ${escapeHtml(o.shopName)} offers on LocalPulse" style="display:block;border:1px solid #E7E3DB;border-radius:4px;background:#fff;" />
          <p style="margin:16px 0 0;font-size:13px;color:rgba(23,27,26,0.65);line-height:1.6;">
            Anyone who scans it lands on your LocalPulse page — your live offers, your contest, one tap from claiming. No app? It sends them to download it first.
          </p>
        </td></tr>
      </table>
    </td></tr>

    <tr><td style="padding:0 32px 24px;font-family:Helvetica,Arial,sans-serif;">
      <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#171B1A;">Three things worth doing today</p>
      <p style="margin:0 0 6px;font-size:14px;line-height:1.6;color:rgba(23,27,26,0.75);">1. Publish a promotion — it appears in the nearby feed immediately.</p>
      <p style="margin:0 0 6px;font-size:14px;line-height:1.6;color:rgba(23,27,26,0.75);">2. Set your contest prize and voting deadline, so customers can start suggesting deals.</p>
      <p style="margin:0 0 6px;font-size:14px;line-height:1.6;color:rgba(23,27,26,0.75);">3. Print the QR code above and put it somewhere customers wait.</p>
    </td></tr>

    <tr><td style="padding:0 32px 28px;font-family:Helvetica,Arial,sans-serif;">
      <a href="${o.scanUrl}" style="display:inline-block;background:#F2542D;color:#FAF7F2;text-decoration:none;padding:13px 26px;border-radius:3px;font-size:15px;font-weight:600;">See your page</a>
    </td></tr>

    <tr><td style="padding:0 32px 32px;font-family:Helvetica,Arial,sans-serif;border-top:1px solid #E7E3DB;padding-top:20px;">
      <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#171B1A;">Know another business that belongs here?</p>
      <p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:rgba(23,27,26,0.75);">
        Refer them and you get a free month when they subscribe — automatically applied to your next bill.
      </p>
      <p style="margin:0;font-size:13px;font-family:monospace;color:#171B1A;">${o.referralUrl}</p>
    </td></tr>

    <tr><td align="center" style="padding:20px 32px 28px;font-family:Helvetica,Arial,sans-serif;background:#151A1D;border-radius:0 0 5px 5px;">
      <p style="margin:0;font-size:12px;color:rgba(250,247,242,0.7);">LocalPulse · Stop surviving. Start thriving.</p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!)
  );
}
