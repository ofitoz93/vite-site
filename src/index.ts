// index.ts içeriği
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = 're_your_api_key'; // Resend'den alacağın key

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('xvgdxasuekjtatecxzso')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // SQL'de yazdığımız fonksiyonu çağırıyoruz
  const { data: list } = await supabase.rpc('check_expiring_documents');

  for (const item of list) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Arşiv Sistemi <onboarding@resend.dev>',
        to: item.email,
        subject: 'Belge Süresi Hatırlatması',
        html: `<strong>${item.process_name}</strong> isimli belgenizin süresi 5 gün içinde dolacaktır.`
      })
    });
  }

  return new Response("Tamamlandı", { status: 200 });
})