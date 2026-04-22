import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  Upload as UploadIcon, 
  X, 
  Image as ImageIcon, 
  CheckCircle2, 
  ChevronLeft,
  Maximize2,
  Trash2
} from 'lucide-react';
import { cn } from './lib/utils';

interface Photo {
  id: string;
  url: string;
  user_ip: string;
  created_at: string;
}

export default function Photos() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deviceId, setDeviceId] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Récupérer ou créer un ID d'appareil unique
  useEffect(() => {
    let storedId = localStorage.getItem('vane_device_id');
    if (!storedId) {
      storedId = 'dev_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      localStorage.setItem('vane_device_id', storedId);
    }
    setDeviceId(storedId);
  }, []);

  // 2. Charger mes photos (filtrées par appareil)
  const fetchMyPhotos = async () => {
    if (!deviceId) return;
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('user_ip', deviceId)
      .order('created_at', { ascending: false });
    
    if (error) console.error("Erreur fetch:", error);
    else setPhotos(data || []);
  };

  useEffect(() => {
    if (!deviceId) return;
    
    fetchMyPhotos();

    // Abonnement Temps Réel pour l'utilisateur
    const channel = supabase
      .channel(`upload-changes-${deviceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'photos' }, payload => {
        if (payload.eventType === 'INSERT' && payload.new.user_ip === deviceId) {
            setPhotos(prev => {
                if (prev.some(p => p.id === payload.new.id)) return prev;
                return [payload.new as Photo, ...prev];
            });
        } else if (payload.eventType === 'DELETE') {
            setPhotos(prev => prev.filter(p => p.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [deviceId]);

  // 3. Gérer l'upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const files = event.target.files;
      if (!files || files.length === 0) return;
      if (files.length > 10) {
        alert("Maximum 10 photos à la fois !");
        return;
      }

      setUploading(true);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${deviceId}/${fileName}`;

        // Upload vers Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('event-photos')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Récupérer l'URL publique
        const { data } = supabase.storage
          .from('event-photos')
          .getPublicUrl(filePath);

        const publicUrl = data.publicUrl;

        // Enregistrer en base de données avec l'ID de l'appareil
        const { error: dbError } = await supabase
          .from('photos')
          .insert([{ url: publicUrl, user_ip: deviceId }]);

        if (dbError) throw dbError;
      }

      await fetchMyPhotos();
    } catch (error: any) {
      alert("Erreur lors de l'envoi : " + error.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string, url: string) => {
    if (!confirm("Supprimer cette photo ?")) return;

    try {
      // 1. Supprimer de la DB
      const { error: dbError } = await supabase
        .from('photos')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      // 2. Extraire le chemin du stockage depuis l'URL
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
      {/* Header */}
      <header className="max-w-xl mx-auto flex items-center justify-between mb-8">
        <button 
           onClick={() => window.history.back()}
           className="p-2 bg-white/70 rounded-xl border border-rose-200"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] opacity-40 mb-1">Galerie Instantanée</p>
            <h1 className="text-2xl font-serif">Souvenirs de Vane</h1>
        </div>
        <div className="w-9" />
      </header>

      <main className="max-w-xl mx-auto space-y-8">
        {/* Upload Zone */}
        <section 
          className={cn(
            "relative group overflow-hidden bg-white/60 backdrop-blur-xl border-2 border-dashed border-rose-200 rounded-[2.5rem] p-10 transition-all active:scale-[0.98]",
            uploading && "opacity-50 pointer-events-none"
          )}
        >
          <input 
            type="file" 
            multiple 
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          
          <div 
            className="flex flex-col items-center text-center space-y-4"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-16 h-16 bg-[#831843] rounded-full flex items-center justify-center shadow-lg shadow-[#831843]/20 text-white">
              {uploading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Camera className="w-8 h-8" />
              )}
            </div>
            
            <div className="space-y-1">
              <h3 className="font-serif text-xl">Partagez vos photos</h3>
              <p className="text-[11px] font-medium opacity-50 uppercase tracking-widest leading-relaxed">
                Cliquez pour choisir jusqu'à 10 photos<br/>prises pendant la soirée
              </p>
            </div>
          </div>
        </section>

        {/* My Photos Gallery */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-bold uppercase tracking-widest opacity-40">Vos envois</h2>
            <span className="text-[10px] bg-white/80 px-2 py-1 rounded-full border border-rose-100">{photos.length} photos</span>
          </div>

          {photos.length === 0 ? (
            <div className="bg-white/30 rounded-[2rem] p-12 text-center border border-rose-100/50">
              <ImageIcon className="w-10 h-10 mx-auto opacity-10 mb-3" />
              <p className="text-xs italic opacity-40">Vos photos apparaîtront ici dès l'upload...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {photos.map((photo) => (
                  <motion.div
                    key={photo.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="aspect-square rounded-3xl overflow-hidden bg-rose-100 border border-rose-200 relative group cursor-pointer shadow-sm active:scale-95 transition-transform"
                    onClick={() => setSelectedImage(photo.url)}
                  >
                    <img 
                      src={photo.url} 
                      alt="Capture de la soirée" 
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Control Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 flex flex-col justify-between p-3">
                        <div className="flex justify-end">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(photo.id, photo.url);
                                }}
                                className="p-2 bg-white/20 backdrop-blur-md rounded-xl text-white shadow-lg active:scale-90 transition-transform z-10"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex justify-center pb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Maximize2 className="text-white w-6 h-6" />
                        </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>
      </main>

      {/* Fullscreen Preview */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <button className="absolute top-8 right-8 text-white/50 hover:text-white p-2">
              <X className="w-8 h-8" />
            </button>
            <motion.img
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              src={selectedImage}
              className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#fff1f2] via-[#fff1f2] to-transparent pointer-events-none">
        <div className="max-w-xl mx-auto text-center">
           <span className="text-[9px] font-bold uppercase tracking-[0.4em] opacity-30">
              Vanessa Mocha • Memories
           </span>
        </div>
      </footer>
    </div>
  );
}
