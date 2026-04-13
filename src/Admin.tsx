import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  Users, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  LogOut, 
  Search, 
  Download,
  LayoutGrid,
  List,
  BarChart3,
  Mail,
  Database,
  MessageSquare
} from 'lucide-react';
import { cn } from './lib/utils';

interface RSVP {
  id: string;
  name: string;
  email?: string;
  is_attending: boolean;
  adult_count?: number;
  message?: string;
  created_at: string;
  source?: 'supabase' | 'firebase';
}

interface AdminProps {
  onBack?: () => void;
}

export default function Admin({ onBack }: AdminProps) {
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showMobileStats, setShowMobileStats] = useState(false);
  const [activeToast, setActiveToast] = useState<{name: string, attending: boolean} | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rsvps')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRsvps(data || []);
    } catch (err) {
      console.error('Erreur lors du chargement:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Demander la permission pour les notifications Push au chargement
    if ("Notification" in window) {
      if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
      }
    }

    const channel = supabase
      .channel('admin-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'rsvps' 
      }, (payload) => {
        console.log("Mise à jour reçue !", payload);
        fetchData();
        
        if (payload.eventType === 'INSERT') {
          const newGuest = payload.new as RSVP;
          
          // 1. Notification Sonore
          new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {});

          // 2. Toast Interne
          setActiveToast({ name: newGuest.name, attending: newGuest.is_attending });
          
          // 3. Vibration
          if ("vibrate" in navigator) navigator.vibrate([100, 30, 100]);

          // Fermeture automatique du toast
          setTimeout(() => setActiveToast(null), 5000);

          // 4. Notification Push (Optionnelle, si supportée)
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filteredGuests = rsvps.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.email && r.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const attendingCount = rsvps.filter(r => r.is_attending).length;
  
  const stats = [
    { label: 'Total Invités', val: rsvps.length, icon: Users, color: 'text-rose-900', bg: 'bg-rose-50' },
    { label: 'Présences', val: attendingCount, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Absences', val: rsvps.length - attendingCount, icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-50' },
    { label: 'Taux Réponse', val: rsvps.length > 0 ? `${Math.round((attendingCount/rsvps.length)*100)}%` : '0%', icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' }
  ];

  return (
    <div className="min-h-screen bg-[#fdf2f8] text-rose-950 p-6 sm:p-12 relative overflow-x-hidden pt-28 md:pt-12">
      {/* Toast de Notification */}
      <AnimatePresence>
        {activeToast && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md"
          >
            <div className={cn(
              "p-4 rounded-3xl border shadow-2xl flex items-center gap-4 backdrop-blur-md",
              activeToast.attending 
                ? "bg-emerald-500/90 border-emerald-400 text-white" 
                : "bg-rose-500/90 border-rose-400 text-white"
            )}>
              <div className="bg-white/20 p-3 rounded-2xl">
                {activeToast.attending ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Nouvelle Réponse !</p>
                <p className="font-serif text-lg leading-tight">
                  <span className="font-bold">{activeToast.name}</span> {activeToast.attending ? "sera présent(e) !" : "ne peut pas venir"}
                </p>
              </div>
              <button 
                onClick={() => setActiveToast(null)}
                className="p-2 hover:bg-white/20 rounded-xl transition-all"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 bg-[#fdf2f8]">
        <div className="absolute top-[-5%] right-[-5%] w-[50%] h-[50%] bg-pink-200/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[50%] h-[50%] bg-rose-200/40 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-6xl mx-auto space-y-10 relative z-10">
        {/* Navigation bar */}
        <header className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack || (() => window.history.back())}
              className="p-3 bg-white/70 rounded-2xl text-rose-900 border border-rose-200/60 hover:bg-white transition-all shadow-sm"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-serif text-rose-950 leading-tight">Vane's Dashboard</h1>
              <p className="text-rose-900/40 text-[10px] font-bold uppercase tracking-[0.2em]">Gestion des Invitations</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                // Test Son
                new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play()
                  .then(() => console.log("Son OK"))
                  .catch(e => console.error("Erreur Son:", e));
                
                // Test Notification
                if ("Notification" in window) {
                  Notification.requestPermission().then(permission => {
                    if (permission === "granted") {
                      new Notification("Test de Notification ✨", {
                        body: "Si vous voyez ceci, les notifications Push fonctionnent !",
                        icon: "/favicon.svg"
                      });
                    } else {
                      alert("Permission de notification refusée : " + permission);
                    }
                  });
                }
              }}
              className="p-4 rounded-2xl bg-white/70 border border-blue-200/60 text-blue-900/60 hover:bg-blue-50 transition-all flex items-center gap-2"
              title="Tester les notifications"
            >
              <MessageSquare className="w-6 h-6" />
              <span className="text-xs font-bold hidden md:inline">TEST NOTIF</span>
            </button>
            <button 
              onClick={() => setShowMobileStats(!showMobileStats)}
              className="md:hidden p-4 rounded-2xl bg-white/70 border border-rose-200/60 text-rose-900/60 hover:bg-white transition-all"
            >
              <BarChart3 className="w-6 h-6" />
            </button>
            <button className="p-4 rounded-2xl bg-white/70 border border-rose-200/60 text-rose-900/60 hover:text-rose-600 hover:bg-white transition-all">
              <LogOut className="w-6 h-6" />
            </button>
          </div>
        </header>

        {/* Stats view */}
        <div className={cn(
          "grid grid-cols-1 md:grid-cols-4 gap-4 mb-12 transition-all",
          showMobileStats ? "grid" : "hidden md:grid"
        )}>
          {stats.map((stat, i) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              key={stat.label}
              className="bg-white/70 border border-rose-200/60 p-6 rounded-[2rem] flex items-center justify-between shadow-sm"
            >
              <div>
                <p className="text-[10px] font-bold uppercase text-rose-900/40 tracking-widest mb-1">{stat.label}</p>
                <p className={cn("text-3xl font-serif", stat.color)}>{stat.val}</p>
              </div>
              <div className={cn("p-4 rounded-2xl", stat.bg)}>
                <stat.icon className={cn("w-6 h-6", stat.color)} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Filters and View controls */}
        <div className="flex flex-col md:flex-row gap-6 mb-8 items-center bg-white/30 p-4 rounded-[2.5rem] border border-rose-100/50">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-rose-300 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Rechercher un nom..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-white/70 border border-rose-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-200 text-rose-950 placeholder-rose-300 transition-all font-medium"
            />
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex bg-rose-100/30 p-1 rounded-xl border border-rose-200/30 shrink-0">
              <button 
                onClick={() => setViewMode('grid')}
                className={cn(
                  "p-2 px-4 rounded-lg transition-all",
                  viewMode === 'grid' ? "bg-white text-rose-600 shadow-sm" : "text-rose-400 hover:text-rose-600"
                )}
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={cn(
                  "p-2 px-4 rounded-lg transition-all",
                  viewMode === 'list' ? "bg-white text-rose-600 shadow-sm" : "text-rose-400 hover:text-rose-600"
                )}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
            
            <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-rose-600 text-white rounded-2xl hover:bg-rose-700 transition-all font-medium text-sm shadow-md active:scale-95">
              <Download className="w-5 h-5" />
              <span className="md:hidden lg:inline">Export</span>
            </button>
          </div>
        </div>

        {/* Content area */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin" />
              <p className="font-serif italic text-rose-300">Récupération des réponses...</p>
            </div>
          </div>
        ) : (
          <div className="min-h-[400px]">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-1">
                <AnimatePresence>
                  {filteredGuests.map((guest) => (
                    <motion.div
                      key={guest.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="bg-white/70 border border-rose-200/60 rounded-[2rem] p-7 flex flex-col justify-between group hover:border-rose-400/50 transition-all duration-300 shadow-sm overflow-hidden"
                    >
                      <div className="space-y-5">
                        <div className="flex justify-between items-start">
                          <span className={cn(
                            "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                            guest.is_attending 
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                              : "bg-rose-50 text-rose-600 border-rose-100"
                          )}>
                            {guest.is_attending ? 'PRÉSENT' : 'ABSENT'}
                          </span>
                          <div className="flex items-center gap-1 text-[10px] font-bold text-rose-900/20 uppercase">
                            {guest.source === 'firebase' ? <Database className="w-3 h-3" /> : <Mail className="w-3 h-3" />}
                          </div>
                        </div>
                        <div>
                          <h3 className="text-2xl font-serif text-rose-950 mb-1 leading-tight group-hover:text-rose-600 transition-colors">{guest.name}</h3>
                          <p className="text-rose-900/40 text-[10px] font-medium uppercase tracking-wider truncate">
                            {guest.email || "Non renseigné"}
                          </p>
                        </div>
                        
                        {guest.message && (
                          <div className="bg-rose-50/50 rounded-xl p-3 border border-rose-100/50">
                            <p className="text-[11px] italic text-rose-900/70 border-l-2 border-rose-200 pl-3 leading-relaxed line-clamp-3">
                              "{guest.message}"
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="mt-8 pt-6 border-t border-rose-100/50 flex items-center justify-between">
                        <div>
                          <p className="text-[9px] font-bold text-rose-900/20 uppercase tracking-widest mb-1">Adultes</p>
                          <span className="text-lg font-serif text-rose-900 italic font-medium">{guest.adult_count || 1}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-serif text-[10px] text-rose-300 italic">
                            {new Date(guest.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {filteredGuests.length === 0 && (
                  <div className="col-span-full text-center py-20 bg-white/20 rounded-[2rem] border border-dashed border-rose-200">
                    <p className="font-serif italic text-rose-400">Aucun résultat pour cette recherche.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white/70 border border-rose-200/60 rounded-[2.5rem] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-rose-50/50">
                        <th className="px-8 py-5 text-left text-[10px] font-bold text-rose-900/40 uppercase tracking-widest">Invité</th>
                        <th className="px-8 py-5 text-center text-[10px] font-bold text-rose-900/40 uppercase tracking-widest">Statut</th>
                        <th className="px-8 py-5 text-center text-[10px] font-bold text-rose-900/40 uppercase tracking-widest">Adultes</th>
                        <th className="px-8 py-5 text-right text-[10px] font-bold text-rose-900/40 uppercase tracking-widest">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredGuests.map((guest) => (
                        <tr key={guest.id} className="border-t border-rose-100/30 hover:bg-rose-50/50 transition-colors group">
                          <td className="px-8 py-5">
                            <div className="font-serif text-lg text-rose-950 group-hover:text-rose-600 transition-colors">{guest.name}</div>
                            <div className="text-[10px] text-rose-900/30 font-medium uppercase tracking-wider">{guest.email || "—"}</div>
                          </td>
                          <td className="px-8 py-5 text-center">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-[9px] font-bold",
                              guest.is_attending ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                            )}>
                              {guest.is_attending ? 'PRÉSENT' : 'ABSENT'}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-center font-serif text-rose-900 italic text-lg">
                            {guest.adult_count || 1}
                          </td>
                          <td className="px-8 py-5 text-right text-[10px] text-rose-300 italic">
                            {new Date(guest.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredGuests.length === 0 && (
                    <div className="text-center py-20">
                      <p className="font-serif italic text-rose-400">Aucun résultat pour cette recherche.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
