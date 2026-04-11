import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { Resend } from "resend";
import { initializeApp as initializeFirebaseApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import dotenv from "dotenv";
import fs from 'fs';

dotenv.config();

// Load Firebase config
const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const firebaseApp = initializeFirebaseApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for confirmation
  app.post("/api/confirm", async (req, res) => {
    const { name, message, isAttending } = req.body;

    try {
      // 1. Save to Firebase Firestore
      await addDoc(collection(db, 'rsvps'), {
        name,
        message: message || '',
        isAttending,
        createdAt: serverTimestamp()
      });

      // 2. Send Email via Resend
      if (process.env.RESEND_API_KEY) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const subject = isAttending 
          ? `${name} a confirmé sa présence pour ton anniversaire !` 
          : `${name} ne pourra pas être présent(e) pour ton anniversaire`;
        
        await resend.emails.send({
          from: 'Invitations <onboarding@resend.dev>',
          to: 'Vanessaelebe2@gmail.com',
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
              
              <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #fce7f3; text-align: center;">
                <p style="font-size: 12px; color: #9ca3af; letter-spacing: 2px; text-transform: uppercase; margin: 0;">
                  Vanessa Mocha • 40 Years of Magic
                </p>
              </div>
            </div>
          `,
        });
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error in /api/confirm:", error);
      res.status(500).json({ error: "Failed to process confirmation" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
