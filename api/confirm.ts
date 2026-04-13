import { Resend } from "resend";
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  // Logs pour le dashboard Vercel
  console.log("--- Requête reçue ---");
  console.log("Méthode:", req.method);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { name, message, isAttending } = req.body;
  console.log("Données JSON reçues:", { name, isAttending });

  // Récupération des clés
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;

  // Sécurité : Vérification des variables
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("ERREUR: Configuration Supabase manquante (VITE_SUPABASE_URL ou KEY)");
    return res.status(500).json({ 
      success: false, 
      error: "Le serveur n'est pas configuré. Vérifiez les variables d'environnement Supabase sur Vercel." 
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    console.log("Tentative d'insertion Supabase...");
    const { error: rsvpError } = await supabase
      .from('rsvps')
      .insert([{ name, message: message || '', is_attending: isAttending }]);

    if (rsvpError) {
      console.error("Erreur Supabase detail:", rsvpError);
      return res.status(500).json({ success: false, error: "Erreur Supabase: " + rsvpError.message });
    }
    console.log("Insertion Supabase réussie !");

    if (resendApiKey) {
      console.log("Envoi de l'email via Resend...");
      const resend = new Resend(resendApiKey);
      const subject = isAttending 
        ? `${name} a confirmé sa présence !` 
        : `${name} ne pourra pas venir`;
      
      const host = req.headers.host;
      const origin = host ? `https://${host}` : '';

      const emailResult = await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: ['Vanessaelebe2@gmail.com', 'teyadesigner@gmail.com'],
        bcc: 'maeshteya@gmail.com',
        subject: subject,
        html: `
          <div style="font-family: 'Playfair Display', serif; color: #4a041a; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #fce7f3; border-radius: 24px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <h2 style="color: #831843; border-bottom: 1px solid #fce7f3; padding-bottom: 15px; text-align: center; font-size: 24px;">Réponse à ton Invitation</h2>
            <p style="font-size: 16px; line-height: 1.6;">Coucou Vanessa,</p>
            <p style="font-size: 16px; line-height: 1.6;"><strong>${name}</strong> vient de répondre à l'invitation.</p>
            <div style="background-color: #fff1f2; padding: 20px; border-radius: 16px; margin: 25px 0; text-align: center;">
              <p style="margin: 0; font-size: 18px; color: #9f1239; font-weight: 600;">
                ${isAttending ? '✨ Sera présent(e) !' : '😔 Ne pourra pas être présent(e)'}
              </p>
            </div>
            ${message ? `<p><i>"${message}"</i></p>` : ''}
            <div style="margin-top: 35px; text-align: center;">
              <a href="${origin}/Admin" style="background-color: #831843; color: #ffffff; padding: 14px 28px; border-radius: 50px; text-decoration: none; font-weight: bold;">
                Voir toute la liste d'invités
              </a>
            </div>
          </div>
        `,
      });
      console.log("Résultat Resend:", emailResult);
    } else {
      console.warn("Attention: RESEND_API_KEY manquante, email non envoyé.");
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("Erreur critique handler:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Erreur interne: " + (error.message || "Inconnue")
    });
  }
}
