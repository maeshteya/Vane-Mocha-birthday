import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Download, 
  X, 
  Grid3X3, 
  Layout, 
  ChevronLeft,
  Maximize2,
  Share2,
  Trash2
} from 'lucide-react';
import { cn } from './lib/utils';

interface Photo {
  id: string;
  url: string;
  user_ip: string;
  created_at: string;
}

export default function Gallery() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const fetchAllPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPhotos(data || []);
    } catch (err) {
      console.error("Erreur chargement galerie:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllPhotos();

    // Abonnement Temps Réel pour les ajouts et suppressions
    const channel = supabase
      .channel('gallery-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'photos' }, payload => {
        if (payload.eventType === 'INSERT') {
            setPhotos(prev => {
                // Éviter les doublons
                if (prev.some(p => p.id === payload.new.id)) return prev;
                return [payload.new as Photo, ...prev];
            });
        } else if (payload.eventType === 'DELETE') {
            setPhotos(prev => prev.filter(p => p.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const downloadImage = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `vane-mocha-memory-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Erreur téléchargement:", err);
    }
  };

  const handleDelete = async (id: string, url: string) => {
    if (!confirm("Voulez-vous supprimer cette photo de la galerie collective ?")) return;

    try {
      // 1. Supprimer de la DB
      const { error: dbError } = await supabase
        .from('photos')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      // 2. Supprimer du Storage
      const path = url.split('event-photos/')[1];
      if (path) {
        await supabase.storage.from('event-photos').remove([path]);
      }

      setPhotos(prev => prev.filter(p => p.id !== id));
    } catch (error: any) {
      alert("Erreur lors de la suppression : " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#fff1f2] text-[#831843] p-4 md:p-8 font-sans pb-24">
      {/* Header Section */}
      <header className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 mt-4">
        <div className="flex items-center gap-6">
            <button 
                onClick={() => window.history.back()}
                className="p-3 bg-white/70 rounded-2xl border border-rose-200 hover:bg-white transition-all shadow-sm"
            >
                <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
                <h1 className="text-3xl md:text-5xl font-serif mb-1">Galerie Collector</h1>
                <p className="text-[#831843]/40 text-[9px] font-bold uppercase tracking-[0.3em]">Tous vos souvenirs en un seul endroit</p>
            </div>
        </div>
        
        <div className="flex items-center gap-3 self-end md:self-auto">
             <div className="bg-white/40 p-1.5 rounded-2xl border border-rose-100/50 flex gap-1">
                <span className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#831843]/60 italic font-serif">
                    {photos.length} Souvenirs
                </span>
            </div>
        </div>
      </header>

      {/* Gallery Grid */}
      <main className="max-w-6xl mx-auto">
        {loading ? (
             <div className="flex justify-center py-40 opacity-30">
                <div className="animate-pulse font-serif italic text-lg tracking-widest">Chargement de la magie...</div>
             </div>
        ) : photos.length === 0 ? (
            <div className="text-center py-40 bg-white/30 rounded-[3rem] border border-dashed border-rose-200">
                <Layout className="w-12 h-12 mx-auto opacity-10 mb-4" />
                <p className="font-serif italic text-lg opacity-40">La galerie est encore vide.<br/>Soyez les premiers à partager !</p>
            </div>
        ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                <AnimatePresence mode="popLayout">
                    {photos.map((photo) => (
                        <motion.div
                            key={photo.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="group relative aspect-[4/5] rounded-[2rem] overflow-hidden bg-white shadow-sm hover:shadow-xl hover:shadow-[#831843]/5 transition-all duration-500 cursor-pointer"
                            onClick={() => setSelectedImage(photo.url)}
                        >
                            <img 
                                src={photo.url} 
                                alt="Souvenir" 
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                            
                            {/* Control Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#831843]/60 via-transparent to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 flex flex-col justify-between p-4">
                                {/* Top Actions (Delete) */}
                                <div className="flex justify-end">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(photo.id, photo.url);
                                        }}
                                        className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl text-white/90 hover:bg-white/40 transition-all active:scale-90 shadow-sm"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Bottom Actions (Download/Expand) */}
                                <div className="flex items-center justify-between">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            downloadImage(photo.url);
                                        }}
                                        className="p-3 bg-white/20 backdrop-blur-md rounded-xl text-white hover:bg-white/40 transition-all active:scale-90"
                                    >
                                        <Download className="w-5 h-5" />
                                    </button>
                                    <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl text-white">
                                        <Maximize2 className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        )}
      </main>

      {/* Fullscreen Preview */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <div className="absolute top-8 right-8 flex gap-4">
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        downloadImage(selectedImage);
                    }}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
                >
                    <Download className="w-6 h-6" />
                </button>
                <button className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all">
                    <X className="w-6 h-6" />
                </button>
            </div>
            
            <motion.img
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              src={selectedImage}
              className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="fixed bottom-0 left-0 right-0 p-8 text-center bg-gradient-to-t from-[#fff1f2] via-[#fff1f2] to-transparent pointer-events-none">
           <span className="text-[10px] font-bold uppercase tracking-[0.5em] opacity-30 font-serif italic">
              Vanessa Mocha • 40 Ans de Magie
           </span>
      </footer>
    </div>
  );
}
