import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { db as firestore } from './firebase';
import { collection, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  Users, 
  CheckCircle2, 
  XCircle, 
  MessageSquare, 
  RefreshCw, 
  ArrowRight,
  TrendingUp,
  Mail,
  Database
} from 'lucide-react';
import { cn } from './lib/utils';
import { Link } from 'react-router-dom';

interface RSVP {
  id: string;
  name: string;
  is_attending: boolean;
  message?: string;
  created_at: string;
  source?: 'supabase' | 'firebase';
}

export default function Admin() {
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'present' | 'absent'>('all');

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: sbData, error: sbError } = await supabase
        .from('rsvps')
        .select('*')
        .order('created_at', { ascending: false });

      if (sbError) throw sbError;

      const formattedSB: RSVP[] = (sbData || []).map(r => ({ ...r, source: 'supabase' }));

      let formattedFB: RSVP[] = [];
      try {
        const fbCol = collection(firestore, 'rsvps');
        const fbSnapshot = await getDocs(fbCol);
        formattedFB = fbSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            is_attending: data.isAttending ?? data.is_attending,
            message: data.message,
            created_at: data.createdAt?.toDate?.()?.toISOString() || data.created_at || new Date().toISOString(),
            source: 'firebase'
          };
        });
      } catch (fbErr) {
        console.warn("Firebase fetch skipped:", fbErr);
      }

      const allRSVPs = [...formattedSB, ...formattedFB].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setRsvps(allRSVPs);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const playNotificationSound = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.volume = 0.5;
    audio.play().catch(e => console.log("Sound blocked by browser"));
  };

  useEffect(() => {
    // Demander la permission de notification au chargement
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    fetchData();

    const channel = supabase
      .channel('rsvps-admin')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'rsvps' 
      }, (payload) => {
        const newRSVP = payload.new as RSVP;
        
        // Notification sonore
        playNotificationSound();

        // Notification de navigateur
        if (Notification.permission === "granted") {
          new Notification("Nouvel Invité ! ✨", {
            body: `${newRSVP.name} vient de répondre : ${newRSVP.is_attending ? 'Présent' : 'Absent'}`,
            icon: '/favicon.svg'
          });
        }

        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filteredRSVPs = rsvps.filter(r => {
    if (filter === 'present') return r.is_attending;
    if (filter === 'absent') return !r.is_attending;
    return true;
  });

  const attendingCount = rsvps.filter(r => r.is_attending).length;

  return (
    <div className="min-h-screen bg-[#fdf2f8] text-rose-950 p-6 sm:p-12 relative overflow-x-hidden">
      {/* Background Elements */}
      <div className="fixed inset-0 -z-10 bg-[#fdf2f8]">
        <div className="absolute top-[-5%] right-[-5%] w-[50%] h-[50%] bg-pink-200/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[50%] h-[50%] bg-rose-200/40 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-6xl mx-auto space-y-10 relative z-10">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <Link 
              to="/"
              className="p-3 bg-white/40 backdrop-blur-md rounded-2xl text-rose-900 border border-white/60 hover:bg-white/60 transition-all shadow-sm"
            >
              <ChevronLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-3xl sm:text-4xl font-serif text-rose-900 leading-tight">Tableau de Bord</h1>
              <p className="text-rose-800/60 font-medium tracking-wide uppercase text-[10px]">Vanessa Mocha • 40 Ans</p>
            </div>
          </div>
          <button 
            onClick={fetchData}
            className="flex items-center gap-2 px-5 py-2.5 bg-rose-900 text-white rounded-full text-sm font-medium hover:bg-rose-800 transition-all shadow-md active:scale-95"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Actualiser
          </button>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Total Invités', val: rsvps.length, icon: Users, color: 'text-rose-900' },
            { label: 'Présences', val: attendingCount, icon: CheckCircle2, color: 'text-emerald-600' },
            { label: 'Absences', val: rsvps.length - attendingCount, icon: XCircle, color: 'text-rose-500' },
            { label: 'Taux Réponse', val: rsvps.length > 0 ? `${Math.round((attendingCount/rsvps.length)*100)}%` : '0%', icon: TrendingUp, color: 'text-blue-600' }
          ].map((stat, i) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              key={stat.label}
              className="glass p-6 rounded-[2rem] flex items-center justify-between"
            >
              <div>
                <p className="text-[10px] font-bold uppercase text-rose-900/40 tracking-widest mb-1">{stat.label}</p>
                <p className={cn("text-3xl font-serif font-bold", stat.color)}>{stat.val}</p>
              </div>
              <div className={cn("p-3 rounded-2xl bg-white/50 border border-white/80", stat.color)}>
                <stat.icon className="w-6 h-6" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex justify-center">
          <div className="flex bg-white/40 backdrop-blur-sm p-1.5 rounded-2xl border border-white/60 shadow-sm">
            {(['all', 'present', 'absent'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={cn(
                  "px-8 py-2 text-xs font-bold rounded-xl transition-all capitalize tracking-wider",
                  filter === t 
                    ? "bg-rose-900 text-white shadow-lg" 
                    : "text-rose-900/60 hover:text-rose-900 hover:bg-white/40"
                )}
              >
                {t === 'all' ? 'Tous' : t === 'present' ? 'Présents' : 'Absents'}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
          <AnimatePresence mode="popLayout">
            {filteredRSVPs.map((rsvp, idx) => (
              <motion.div
                key={rsvp.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="glass rounded-[2rem] p-7 flex flex-col justify-between group hover:border-rose-300 transition-all duration-500"
              >
                <div className="space-y-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-serif text-rose-900 mb-1 group-hover:text-rose-700 transition-colors uppercase tracking-tight">{rsvp.name}</h3>
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          rsvp.is_attending ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-rose-400"
                        )} />
                        <span className="text-[10px] font-bold text-rose-900/40 uppercase tracking-widest">
                          {rsvp.is_attending ? "Sera présente" : "Absence confirmée"}
                        </span>
                      </div>
                    </div>
                    <div className={cn(
                      "p-2 rounded-xl bg-white/50 border",
                      rsvp.is_attending ? "border-emerald-100 text-emerald-600" : "border-rose-100 text-rose-500"
                    )}>
                      {rsvp.is_attending ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                    </div>
                  </div>

                  {rsvp.message ? (
                    <div className="bg-white/30 rounded-2xl p-4 border border-white/40 relative">
                      <MessageSquare className="w-4 h-4 text-rose-900/20 absolute -top-2 -left-2 bg-white rounded-full p-0.5" />
                      <p className="text-sm italic text-rose-900/80 leading-relaxed font-light">"{rsvp.message}"</p>
                    </div>
                  ) : (
                    <p className="text-rose-900/20 text-[10px] italic">Pas de message particulier.</p>
                  )}
                </div>

                <div className="mt-8 pt-5 border-t border-rose-900/5 flex items-center justify-between text-[10px] font-bold text-rose-900/40 uppercase tracking-widest">
                  <div className="flex items-center gap-2">
                    <Database className={cn("w-3 h-3", rsvp.source === 'supabase' ? 'text-blue-400' : 'text-orange-400')} />
                    <span>{rsvp.source}</span>
                  </div>
                  <span>{new Date(rsvp.created_at).toLocaleDateString('fr-FR')} à {new Date(rsvp.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                  
                  {rsvp.source === 'firebase' && (
                    <button 
                      onClick={async () => {
                        const { error } = await supabase.from('rsvps').insert([{
                          name: rsvp.name,
                          message: rsvp.message,
                          is_attending: rsvp.is_attending,
                          created_at: rsvp.created_at
                        }]);
                        if (!error) fetchData();
                      }}
                      className="text-blue-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
                    >
                      MIGRER <ArrowRight className="w-3 h-3 text-blue-500" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredRSVPs.length === 0 && !loading && (
          <div className="glass py-32 text-center rounded-[3rem] border-dashed border-2 border-white/60">
            <Mail className="w-16 h-16 text-rose-900/10 mx-auto mb-6" />
            <p className="text-rose-900/40 font-serif text-2xl">Aucun invité ne correspond.</p>
          </div>
        )}
      </div>
    </div>
  );
}

