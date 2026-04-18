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
    const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

    console.log("Vérification pour:", { name, clientIp });
    
    // 1. Vérifier si le nom existe déjà
    const { data: existingRSVPs } = await supabase
      .from('rsvps')
      .select('*')
      .eq('name', name);

    const existingEntry = existingRSVPs && existingRSVPs.length > 0 ? existingRSVPs[0] : null;

    if (existingEntry) {
      console.log("Mise à jour pour:", name);
      const finalMessage = message || existingEntry.message || '';
      
      const { error: updateError } = await supabase
        .from('rsvps')
        .update({ 
          message: finalMessage, 
          is_attending: isAttending,
          ip: clientIp 
        })
        .eq('id', existingEntry.id);

      if (updateError) throw updateError;
    } else {
      // 2. Vérification optionnelle par IP pour éviter le spam (un seul nom par IP)
      // Si vous voulez être très strict :
      /*
      const { data: ipCheck } = await supabase.from('rsvps').select('id').eq('ip', clientIp);
      if (ipCheck && ipCheck.length > 0) {
        return res.status(403).json({ success: false, error: "Cet appareil a déjà envoyé une réponse." });
      }
      */

      console.log("Nouvelle insertion pour:", name);
      const { error: insertError } = await supabase
        .from('rsvps')
        .insert([{ 
          name, 
          message: message || '', 
          is_attending: isAttending,
          ip: clientIp 
        }]);

      if (insertError) throw insertError;
    }
    console.log("Opération Supabase réussie !");

    if (resendApiKey) {
      try {
        console.log("Envoi de l'email via Resend...");
        const resend = new Resend(resendApiKey);
        const subject = isAttending 
          ? `${name} a confirmé sa présence !` 
          : `${name} ne pourra pas venir`;
        
        const host = req.headers.host;
        const origin = host ? `https://${host}` : '';

        const { data, error: emailError } = await resend.emails.send({
          from: 'onboarding@resend.dev',
          to: ['Vanessaelebe2@gmail.com'], // On teste avec une seule pour commencer
          cc: ['teyadesigner@gmail.com'],
          bcc: ['maeshteya@gmail.com'],
          subject: subject,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px;">
              <h2>Nouvelle réponse RSVP</h2>
              <p><strong>${name}</strong> a répondu : <strong>${isAttending ? 'PRÉSENT' : 'ABSENT'}</strong></p>
              ${message ? `<p>Message : <i>"${message}"</i></p>` : ''}
              <hr />
              <p><a href="${origin}/Admin">Voir la liste complète</a></p>
            </div>
          `,
        });

        if (emailError) {
          console.error("Détails de l'erreur Resend:", emailError);
        } else {
          console.log("Email envoyé avec succès ! ID:", data?.id);
        }
      } catch (err: any) {
        console.error("Exception lors de l'envoi Resend:", err.message);
      }
    } else {
      console.warn("Attention: RESEND_API_KEY manquante sur Vercel.");
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
