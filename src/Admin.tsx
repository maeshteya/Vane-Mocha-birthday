import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  Users, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  Download,
  Database,
  Mail,
  RefreshCw,
  LayoutGrid,
  List
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
  const [filter, setFilter] = useState<'all' | 'present' | 'absent'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ["Nom", "Email", "Statut", "Adultes", "Message", "Date"];
    const rows = rsvps.map(r => [
      `"${r.name.replace(/"/g, '""')}"`,
      `"${(r.email || "N/A").replace(/"/g, '""')}"`,
      `"${r.is_attending ? "Présent" : "Absent"}"`,
      r.adult_count || 1,
      `"${(r.message || "").replace(/"/g, '""')}"`,
      `"${new Date(r.created_at).toLocaleString()}"`
    ]);
    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(";")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `invites_vane_mocha_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('admin-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rsvps' }, (payload) => {
        fetchData();
        if (payload.eventType === 'INSERT') {
          const newGuest = payload.new as RSVP;
          new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {});
          setActiveToast({ name: newGuest.name, attending: newGuest.is_attending });
          setTimeout(() => setActiveToast(null), 5000);
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Nouveau RSVP ! ✨", {
              body: `${newGuest.name} vient de répondre.`,
              icon: "/favicon.svg"
            });
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const attendingCount = rsvps.filter(r => r.is_attending).length;
  const filteredGuests = rsvps.filter(r => {
    if (filter === 'present') return r.is_attending;
    if (filter === 'absent') return !r.is_attending;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#fff1f2] text-[#831843] p-6 md:p-12 font-sans overflow-x-hidden">
      {/* Toast Notification */}
      <AnimatePresence>
        {activeToast && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm"
          >
            <div className={cn(
              "p-4 rounded-3xl border shadow-xl flex items-center justify-center backdrop-blur-md text-white font-serif italic",
              activeToast.attending ? "bg-[#831843]/90 border-rose-400" : "bg-rose-500/90 border-rose-400"
            )}>
                <p className="text-center font-serif text-lg leading-tight tracking-wide">
                    <span className="font-bold">{activeToast.name}</span> vient de confirmer !
                </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto py-4">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-5">
            <button 
              onClick={onBack || (() => window.history.back())}
              className="p-3 bg-white/70 rounded-2xl border border-rose-200 hover:bg-white transition-all shadow-sm"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl md:text-5xl font-serif mb-1">Tableau de Bord</h1>
              <p className="text-[#831843]/40 text-[9px] font-bold uppercase tracking-[0.3em]">Vanessa Mocha • 40 Ans</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 self-end md:self-auto">
             <div className="flex bg-white/40 p-1 rounded-xl border border-rose-100 mr-2">
                <button 
                    onClick={() => setViewMode('grid')}
                    className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-[#831843] text-white shadow-md" : "text-[#831843]/40")}
                >
                    <LayoutGrid className="w-4 h-4" />
                </button>
                <button 
                    onClick={() => setViewMode('list')}
                    className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-[#831843] text-white shadow-md" : "text-[#831843]/40")}
                >
                    <List className="w-4 h-4" />
                </button>
            </div>
            <button 
                onClick={fetchData}
                className="flex items-center gap-2 px-5 py-3 bg-[#831843] text-white rounded-2xl hover:bg-[#a21d54] transition-all font-medium text-[10px] uppercase tracking-widest shadow-lg shadow-[#831843]/20"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
              <span>Actualiser</span>
            </button>
             <button 
                onClick={exportToCSV}
                className="p-3.5 bg-white/70 border border-rose-200 rounded-2xl hover:bg-white transition-all shadow-sm"
                title="Exporter Excel"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Stats Section - Hidden on mobile */}
        <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Total Invités', val: rsvps.length, icon: Users, color: 'text-[#831843]', bg: 'bg-[#831843]/5' },
            { label: 'Présences', val: attendingCount, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Absences', val: rsvps.length - attendingCount, icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-50' },
            { label: 'Taux Réponse', val: rsvps.length > 0 ? `${Math.round((attendingCount/rsvps.length)*100)}%` : '0%', icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' }
          ].map((stat) => (
            <div key={stat.label} className="bg-white/70 border border-rose-100 p-6 rounded-[2.5rem] flex items-center justify-between shadow-sm">
              <div>
                <p className="text-[9px] font-bold uppercase text-[#831843]/30 tracking-widest mb-1.5">{stat.label}</p>
                <p className={cn("text-3xl font-serif", stat.color)}>{stat.val}</p>
              </div>
              <div className={cn("p-3.5 rounded-full", stat.bg)}>
                <stat.icon className={cn("w-5 h-5", stat.color)} />
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex justify-center mb-10">
            <div className="bg-white/40 p-1.5 rounded-2xl border border-rose-100/50 flex gap-1">
                {['all', 'present', 'absent'].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f as any)}
                        className={cn(
                            "px-6 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all",
                            filter === f ? "bg-[#831843] text-white shadow-md shadow-[#831843]/20" : "text-[#831843]/40 hover:text-[#831843]"
                        )}
                    >
                        {f === 'all' ? 'Tous' : f === 'present' ? 'Présents' : 'Absents'}
                    </button>
                ))}
            </div>
        </div>

        {/* Content Section */}
        {loading && rsvps.length === 0 ? (
          <div className="flex justify-center py-20 opacity-30">
            <div className="animate-pulse font-serif italic text-lg tracking-widest text-[#831843]">Charmante attente...</div>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20 px-1">
                {filteredGuests.map((guest) => (
                  <motion.div
                    key={guest.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="bg-[#fff8f9] border border-rose-200/50 rounded-[2.5rem] p-8 flex flex-col justify-between shadow-sm hover:border-[#831843]/30 transition-all duration-300 relative overflow-hidden group"
                  >
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-3xl font-serif text-[#831843] leading-tight mb-2 tracking-tight uppercase">{guest.name}</h3>
                        <div className="flex items-center gap-2">
                             <div className={cn("w-1.5 h-1.5 rounded-full", guest.is_attending ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]")} />
                             <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#831843]/50">
                                {guest.is_attending ? 'SERA PRÉSENTE' : 'INSCRIPTION ABSENTE'}
                             </span>
                        </div>
                      </div>

                      {guest.message && (
                          <div className="bg-[#fff1f2]/60 rounded-[1.5rem] p-5 border border-rose-100/50 mt-4 relative">
                              <p className="text-[13px] italic text-[#831843]/80 leading-relaxed font-medium">
                                  "{guest.message}"
                              </p>
                          </div>
                      )}
                    </div>

                    <div className="mt-8 flex items-center justify-between border-t border-rose-100/30 pt-5">
                       <div className="flex items-center gap-2 text-[#831843]/30">
                          {guest.source === 'firebase' ? <Database className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
                          <span className="text-[9px] font-bold uppercase tracking-widest">{guest.source || 'SUPABASE'}</span>
                       </div>
                       <span className="font-serif text-[11px] text-[#831843]/40 italic">
                          {new Date(guest.created_at).toLocaleDateString()}
                       </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="bg-white/70 border border-rose-100 rounded-[2.5rem] overflow-hidden shadow-sm mb-20 anim-fade-in">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-[#831843] text-white">
                            <th className="px-8 py-4 text-left text-[9px] font-bold uppercase tracking-[0.2em] opacity-80">Invité</th>
                            <th className="px-8 py-4 text-center text-[9px] font-bold uppercase tracking-[0.2em] opacity-80">Statut</th>
                            <th className="px-8 py-4 text-center text-[9px] font-bold uppercase tracking-[0.2em] opacity-80">Adultes</th>
                            <th className="px-8 py-4 text-right text-[9px] font-bold uppercase tracking-[0.2em] opacity-80">Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredGuests.map((guest) => (
                            <tr key={guest.id} className="border-b border-rose-50 hover:bg-rose-100/20 transition-colors">
                                <td className="px-8 py-3.5">
                                    <div className="font-serif text-xl text-[#831843] leading-tight">{guest.name}</div>
                                    <div className="text-[9px] text-[#831843]/40 uppercase tracking-widest font-medium">{guest.email || 'Pas d\'email'}</div>
                                </td>
                                <td className="px-8 py-3.5 text-center">
                                    <div className={cn(
                                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
                                        guest.is_attending ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"
                                    )}>
                                        <div className={cn("w-1 h-1 rounded-full", guest.is_attending ? "bg-emerald-500" : "bg-rose-500")} />
                                        {guest.is_attending ? 'Présent' : 'Absent'}
                                    </div>
                                </td>
                                <td className="px-8 py-3.5 text-center font-serif text-[#831843]/70 italic text-lg">
                                    {guest.adult_count || 1}
                                </td>
                                <td className="px-8 py-3.5 text-right font-serif text-[11px] text-[#831843]/40 italic leading-tight">
                                    {new Date(guest.created_at).toLocaleDateString()}<br/>
                                    {new Date(guest.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
