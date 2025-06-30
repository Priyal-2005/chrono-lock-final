import React, { useState, useEffect } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { Play, Pause, ArrowLeft, Heart, Calendar, Clock, Download, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useWallet } from '../contexts/WalletContext';
import { VoiceMemoryService } from '../services/voiceMemoryService';
import EmotionVisualizer from '../components/EmotionVisualizer';

interface VoiceMemory {
  id: string;
  title: string;
  note?: string;
  unlockDate: Date;
  createdDate: Date;
  emotion: {
    tone: string;
    intensity: number;
  };
  duration: number;
  audioUrl?: string;
  isLocked: boolean;
}

const PlaybackPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { isConnected, accounts } = useWallet();
  
  const [memory, setMemory] = useState<VoiceMemory | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const voiceMemoryService = new VoiceMemoryService();

  if (!isConnected) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    loadMemory();
  }, [id, accounts]);

  const loadMemory = async () => {
    if (!id || !accounts[0]) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get user's memories
      const memories = await voiceMemoryService.getUserMemories(accounts[0]);
      const foundMemory = memories.find(m => m.id === id);
      
      if (!foundMemory) {
        setError('Memory not found');
        return;
      }
      
      if (foundMemory.isLocked) {
        // Check if it's actually unlocked now
        const isUnlocked = await voiceMemoryService.checkMemoryUnlockStatus(foundMemory.contractId);
        if (!isUnlocked) {
          setError('This memory is still time-locked and cannot be played yet.');
          setMemory(foundMemory);
          return;
        }
        foundMemory.isLocked = false;
      }
      
      // Try to retrieve and decrypt the audio
      try {
        const audioBlob = await voiceMemoryService.retrieveVoiceMemory(id, accounts[0]);
        if (audioBlob) {
          const audioUrl = URL.createObjectURL(audioBlob);
          foundMemory.audioUrl = audioUrl;
          
          // Create audio element
          const audio = new Audio(audioUrl);
          audio.addEventListener('timeupdate', () => {
            setCurrentTime(audio.currentTime);
          });
          audio.addEventListener('ended', () => {
            setIsPlaying(false);
            setCurrentTime(0);
          });
          audio.addEventListener('error', () => {
            setError('Failed to load audio. The memory may be corrupted.');
          });
          setAudioElement(audio);
        }
      } catch (audioError: any) {
        console.error('Failed to load audio:', audioError);
        setError(`Failed to load audio: ${audioError.message}`);
      }
      
      setMemory(foundMemory);
      
    } catch (err: any) {
      console.error('Failed to load memory:', err);
      setError('Failed to load memory details');
    } finally {
      setLoading(false);
    }
  };

  const togglePlayback = () => {
    if (!audioElement || !memory?.audioUrl) return;

    if (isPlaying) {
      audioElement.pause();
    } else {
      audioElement.play().catch(err => {
        console.error('Playback failed:', err);
        setError('Failed to play audio. Please try again.');
      });
    }
    setIsPlaying(!isPlaying);
  };

  const downloadAudio = () => {
    if (!memory?.audioUrl) return;
    
    const link = document.createElement('a');
    link.href = memory.audioUrl;
    link.download = `${memory.title}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getEmotionColor = (tone: string) => {
    const colors: Record<string, string> = {
      'Hopeful': 'from-aurora-500 to-aurora-600',
      'Joyful': 'from-gold-400 to-gold-500',
      'Nostalgic': 'from-nebula-500 to-nebula-600',
      'Peaceful': 'from-aurora-400 to-aurora-500',
      'Excited': 'from-cosmos-500 to-cosmos-600',
      'Grateful': 'from-gold-500 to-gold-600'
    };
    return colors[tone] || 'from-starlight-400 to-starlight-500';
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <div className="glass-soft p-16 max-w-2xl mx-auto">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cosmos-400 mx-auto mb-6"></div>
            <h3 className="text-2xl font-display font-light text-starlight-100 mb-4">
              Awakening Your Memory
            </h3>
            <p className="text-starlight-300 font-serif">
              Retrieving your whisper from the cosmic archive...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link
          to="/dashboard"
          className="inline-flex items-center space-x-2 text-starlight-400 hover:text-starlight-200 mb-8 transition-colors font-serif"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Memories</span>
        </Link>
        
        <div className="text-center">
          <div className="glass-soft p-16 max-w-2xl mx-auto border border-nebula-500/30">
            <AlertCircle className="h-12 w-12 text-nebula-400 mx-auto mb-6" />
            <h3 className="text-2xl font-display font-light text-starlight-100 mb-4">
              Memory Unavailable
            </h3>
            <p className="text-starlight-300 font-serif mb-6">{error}</p>
            <button
              onClick={loadMemory}
              className="button-primary px-6 py-3 font-serif"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!memory) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <p className="text-starlight-400 font-serif">Memory not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Back Button */}
      <Link
        to="/dashboard"
        className="inline-flex items-center space-x-2 text-starlight-400 hover:text-starlight-200 mb-8 transition-colors font-serif"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Memories</span>
      </Link>

      <div className="grid lg:grid-cols-2 gap-12">
        {/* Memory Details */}
        <div className="glass-soft p-12">
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-4">
              <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${getEmotionColor(memory.emotion.tone)}`} />
              <span className="text-sm font-serif text-starlight-300">
                Recorded with {memory.emotion.tone.toLowerCase()} emotion
              </span>
            </div>
            <h1 className="text-4xl font-display font-light text-starlight-100 mb-4 text-glow-soft">
              {memory.title}
            </h1>
            {memory.note && (
              <p className="text-starlight-300 leading-relaxed font-serif poetry-spacing">
                {memory.note}
              </p>
            )}
          </div>

          {/* Memory Info */}
          <div className="space-y-6 mb-8">
            <div className="flex items-center text-starlight-300">
              <Calendar className="h-5 w-5 mr-4 text-cosmos-400" />
              <div>
                <p className="font-serif font-medium">Created</p>
                <p className="text-sm text-starlight-400">
                  {memory.createdDate.toLocaleDateString()} 
                  ({formatDistanceToNow(memory.createdDate)} ago)
                </p>
              </div>
            </div>
            <div className="flex items-center text-starlight-300">
              <Clock className="h-5 w-5 mr-4 text-cosmos-400" />
              <div>
                <p className="font-serif font-medium">
                  {memory.isLocked ? 'Unlocks' : 'Unlocked'}
                </p>
                <p className="text-sm text-starlight-400">
                  {memory.unlockDate.toLocaleDateString()} 
                  ({memory.isLocked 
                    ? `in ${formatDistanceToNow(memory.unlockDate)}`
                    : `${formatDistanceToNow(memory.unlockDate)} ago`
                  })
                </p>
              </div>
            </div>
            <div className="flex items-center text-starlight-300">
              <Heart className="h-5 w-5 mr-4 text-nebula-400" />
              <div>
                <p className="font-serif font-medium">Emotional Tone</p>
                <div className="flex items-center space-x-3 mt-2">
                  <span className="text-sm font-serif font-medium">{memory.emotion.tone}</span>
                  <div className="w-24 h-2 bg-white/[0.1] rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r ${getEmotionColor(memory.emotion.tone)} transition-all duration-500`}
                      style={{ width: `${memory.emotion.intensity * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-starlight-400">
                    {Math.round(memory.emotion.intensity * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Playback Controls */}
          {memory.isLocked ? (
            <div className="glass-soft p-8 border border-cosmos-500/30 text-center">
              <Clock className="h-12 w-12 text-cosmos-400 mx-auto mb-4" />
              <h3 className="text-xl font-serif font-medium text-starlight-200 mb-2">
                Still Time-Locked
              </h3>
              <p className="text-starlight-400 font-serif">
                This memory will unlock on {memory.unlockDate.toLocaleDateString()}
              </p>
              <p className="text-whisper mt-2">
                Patience, dear soul. Time guards your whisper well.
              </p>
            </div>
          ) : memory.audioUrl ? (
            <div className="glass-soft p-8 border border-aurora-500/30">
              <div className="flex items-center justify-between mb-6">
                <span className="text-sm font-serif text-starlight-300">
                  {formatTime(currentTime)} / {formatTime(memory.duration)}
                </span>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={downloadAudio}
                    className="flex items-center justify-center w-10 h-10 glass-soft rounded-full hover:bg-white/[0.12] transition-all text-starlight-300 hover:text-starlight-100"
                    title="Download audio"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={togglePlayback}
                    className="flex items-center justify-center w-16 h-16 button-primary rounded-full transition-all transform hover:scale-105"
                  >
                    {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
                  </button>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full h-2 bg-white/[0.1] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-cosmos-500 to-aurora-500 transition-all duration-100"
                  style={{ width: `${memory.duration > 0 ? (currentTime / memory.duration) * 100 : 0}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="glass-soft p-8 border border-nebula-500/30 text-center">
              <AlertCircle className="h-12 w-12 text-nebula-400 mx-auto mb-4" />
              <h3 className="text-xl font-serif font-medium text-starlight-200 mb-2">
                Audio Unavailable
              </h3>
              <p className="text-starlight-400 font-serif">
                The audio for this memory could not be loaded.
              </p>
            </div>
          )}
        </div>

        {/* Emotion Visualizer */}
        <div className="glass-soft p-12">
          <h2 className="text-3xl font-display font-light text-starlight-100 mb-8 text-glow-soft">
            Emotional Journey
          </h2>
          <EmotionVisualizer 
            emotion={memory.emotion}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={memory.duration}
          />
        </div>
      </div>
    </div>
  );
};

export default PlaybackPage;