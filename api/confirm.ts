import { Resend } from "resend";
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  // Activer CORS si nécessaire (Vercel le gère souvent, mais c'est par sécurité)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { name, message, isAttending } = req.body;

  // Configuration depuis les variables d'environnement de Vercel
  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
  const resendApiKey = process.env.RESEND_API_KEY || '';

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // 1. Sauvegarde dans Supabase
    const { error: rsvpError } = await supabase
      .from('rsvps')
      .insert([
        { 
          name, 
          message: message || '', 
          is_attending: isAttending 
        }
      ]);

    if (rsvpError) throw rsvpError;

    // 2. Envoi de l'email via Resend
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      const subject = isAttending 
        ? `${name} a confirmé sa présence pour ton anniversaire !` 
        : `${name} ne pourra pas être présent(e) pour ton anniversaire`;
      
      const origin = req.headers.host ? `https://${req.headers.host}` : '';

      await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: ['Vanessaelebe2@gmail.com', 'teyadesigner@gmail.com'],
        bcc: 'maeshteya@gmail.com',
        subject: subject,
        html: `
          <div style="font-family: 'Playfair Display', serif; color: #4a041a; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #fce7f3; border-radius: 24px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <h2 style="color: #831843; border-bottom: 1px solid #fce7f3; padding-bottom: 15px; text-align: center; font-size: 24px;">Réponse à ton Invitation</h2>
            
            <p style="font-size: 16px; line-height: 1.6;">Coucou Vanessa,</p>
            
            <p style="font-size: 16px; line-height: 1.6;">
              Bonne nouvelle ! <strong>${name}</strong> vient de répondre à l'invitation pour ton 40ème anniversaire.
            </p>
            
            <div style="background-color: #fff1f2; padding: 20px; border-radius: 16px; margin: 25px 0; text-align: center; border: 1px solid #ffe4e6;">
              <p style="margin: 0; font-size: 18px; color: #9f1239; font-weight: 600;">
                ${isAttending ? '✨ Sera présent(e) !' : '😔 Ne pourra pas être présent(e)'}
              </p>
            </div>
            
            ${message ? `
              <div style="border-left: 4px solid #f472b6; padding: 15px 20px; font-style: italic; color: #701a75; background-color: #fdf2f8; border-radius: 0 12px 12px 0; margin-top: 20px;">
                <p style="margin: 0 0 8px 0; font-weight: bold; font-style: normal; color: #831843; font-size: 14px; text-transform: uppercase; tracking: 1px;">Le petit mot de ${name} :</p>
                <span style="font-size: 16px; line-height: 1.5;">"${message}"</span>
              </div>
            ` : `
              <p style="color: #9ca3af; font-size: 14px; text-align: center; font-style: italic; margin-top: 20px;">
                (Aucun message personnel n'a été laissé)
              </p>
            `}

            <div style="margin-top: 35px; text-align: center;">
              <a href="${origin}/Admin" style="background-color: #831843; color: #ffffff; padding: 14px 28px; border-radius: 50px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 4px 10px rgba(131, 24, 67, 0.2);">
                Voir toute la liste d'invités
              </a>
              <p style="font-size: 12px; color: #831843; margin-top: 15px; font-style: italic; opacity: 0.6;">
                Seule toi a accès à ce lien via cet email.
              </p>
            </div>
            
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #fce7f3; text-align: center;">
              <p style="font-size: 12px; color: #9ca3af; letter-spacing: 2px; text-transform: uppercase; margin: 0;">
                Vanessa Mocha • 40 Years of Magic
              </p>
            </div>
          </div>
        `,
      });
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("Erreur API Vercel:", error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || "Erreur lors du traitement"
    });
  }
}
