import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { motion } from 'motion/react';
import { ChevronLeft, Users, CheckCircle2, XCircle, MessageSquare, Calendar, LogIn, ShieldAlert, RefreshCw } from 'lucide-react';
import { cn } from './lib/utils';

interface RSVP {
  id: string;
  name: string;
  is_attending: boolean;
  message?: string;
  created_at: string;
}

interface AdminProps {
  onBack: () => void;
}

export default function Admin({ onBack }: AdminProps) {
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchRSVPs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rsvps')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRsvps(data || []);
      setError(null);
    } catch (err: any) {
      console.error("Error fetching RSVPs:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchRSVPs();
      
      // Subscribe to real-time changes
      const channel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'rsvps' },
          () => {
            fetchRSVPs();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [session]);

  const handleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err: any) {
      console.error("Login error:", err);
      setError("Erreur de connexion : " + err.message);
    }
  };

  const attendingCount = rsvps.filter(r => r.is_attending).length;

  if (!session) {
    return (
      <div className="min-h-screen bg-blue-50 p-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] p-8 shadow-xl text-center space-y-6 border border-blue-100">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto text-blue-600">
            <ShieldAlert className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-serif text-blue-900">Accès Restreint</h2>
            <p className="text-blue-800/60">Veuillez vous connecter avec votre compte administrateur pour voir les réponses.</p>
          </div>
          <button 
            onClick={handleLogin}
            className="w-full py-4 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            <LogIn className="w-5 h-5" /> Se connecter avec Google
          </button>
          <button onClick={onBack} className="text-blue-900/40 hover:text-blue-900 text-sm font-medium">
            Retour à l'invitation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-100 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-blue-900/70 hover:text-blue-900 transition-colors font-medium"
          >
            <ChevronLeft className="w-5 h-5" /> Retour
          </button>
          <div className="text-right">
            <h1 className="text-2xl font-serif text-blue-900">Administration</h1>
            <p className="text-xs text-blue-800/40">{session.user.email}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-3xl shadow-md border border-blue-200 flex items-center gap-4">
            <div className="p-3 bg-blue-500 rounded-2xl text-white">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-blue-900/60">Total Réponses</p>
              <p className="text-2xl font-bold text-blue-900">{rsvps.length}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-md border border-blue-200 flex items-center gap-4">
            <div className="p-3 bg-emerald-500 rounded-2xl text-white">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-blue-900/60">Présents</p>
              <p className="text-2xl font-bold text-blue-900">{attendingCount}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-md border border-blue-200 flex items-center gap-4">
            <div className="p-3 bg-rose-500 rounded-2xl text-white">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-blue-900/60">Absents</p>
              <p className="text-2xl font-bold text-blue-900">{rsvps.length - attendingCount}</p>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-blue-200 overflow-hidden">
          <div className="p-6 border-b border-blue-100 bg-blue-600 text-white flex justify-between items-center">
            <h2 className="font-serif text-xl">Liste des invités</h2>
            <div className="flex gap-2">
              <button 
                onClick={fetchRSVPs}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                title="Actualiser"
              >
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              </button>
              <button 
                onClick={async () => {
                  try {
                    const { error } = await supabase
                      .from('rsvps')
                      .insert([
                        { 
                          name: "Test Admin", 
                          is_attending: true, 
                          message: "Ceci est un test Supabase" 
                        }
                      ]);
                    if (error) throw error;
                    alert("Test envoyé !");
                  } catch (e: any) {
                    alert("Erreur de test : " + e.message);
                  }
                }}
                className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition-colors"
              >
                Envoyer un test
              </button>
            </div>
          </div>
          
          <div className="divide-y divide-blue-100">
            {error ? (
              <div className="p-12 text-center space-y-4">
                <p className="text-rose-600 font-medium">Erreur : {error}</p>
                {error.includes('relation "rsvps" does not exist') ? (
                  <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 text-left space-y-2">
                    <p className="text-rose-800 font-bold text-sm">La table "rsvps" n'existe pas !</p>
                    <p className="text-rose-700 text-xs">Veuillez exécuter le code SQL suivant dans votre SQL Editor Supabase :</p>
                    <pre className="bg-black/5 p-3 rounded-lg text-[10px] overflow-x-auto text-rose-900">
{`create table rsvps (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  message text,
  is_attending boolean default true,
  created_at timestamp with time zone default now()
);

alter table rsvps enable row level security;
create policy "Public insert" on rsvps for insert with check (true);
create policy "Auth select" on rsvps for select using (auth.role() = 'authenticated');`}
                    </pre>
                  </div>
                ) : (
                  <p className="text-sm text-blue-900/60">Vérifiez les politiques RLS sur Supabase.</p>
                )}
                <button onClick={() => supabase.auth.signOut()} className="text-blue-600 underline text-sm">Changer de compte</button>
              </div>
            ) : loading && rsvps.length === 0 ? (
              <div className="p-12 text-center text-blue-900/40">Chargement des données...</div>
            ) : rsvps.length === 0 ? (
              <div className="p-12 text-center text-blue-900/40">Aucune réponse pour le moment.</div>
            ) : (
              rsvps.map((rsvp) => (
                <motion.div 
                  key={rsvp.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-blue-50/20 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-blue-900">{rsvp.name}</span>
                      {rsvp.is_attending ? (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded-full">Présent</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold uppercase rounded-full">Absent</span>
                      )}
                    </div>
                    {rsvp.message && (
                      <div className="flex items-start gap-2 text-blue-800/60 text-sm italic">
                        <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>"{rsvp.message}"</span>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-blue-900/40 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(rsvp.created_at).toLocaleString('fr-FR')}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
