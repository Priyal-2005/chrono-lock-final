import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Mic, Square, Play, Trash2, Calendar, Lock, Upload, Star, Moon, AlertCircle, CheckCircle, ExternalLink, Wallet, Zap } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { useAudio } from '../contexts/AudioContext';
import WaveformVisualizer from '../components/WaveformVisualizer';
import DatePicker from '../components/DatePicker';
import EmotionAnalysis from '../components/EmotionAnalysis';
import { VoiceMemoryService } from '../services/voiceMemoryService';

const RecordPage: React.FC = () => {
  const { isConnected, accounts, peraWallet } = useWallet();
  const { isRecording, audioBlob, audioUrl, startRecording, stopRecording, clearRecording } = useAudio();
  
  const [unlockDate, setUnlockDate] = useState<Date>(new Date(Date.now() + 24 * 60 * 60 * 1000)); // Tomorrow
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [emotion, setEmotion] = useState<{ tone: string; intensity: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [balanceInfo, setBalanceInfo] = useState<{ balance: number; needsFunding: boolean } | null>(null);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [showDemoOption, setShowDemoOption] = useState(false);

  const voiceMemoryService = new VoiceMemoryService();

  if (!isConnected) {
    return <Navigate to="/" replace />;
  }

  // Check balance on component mount and when accounts change
  useEffect(() => {
    const checkBalance = async () => {
      if (accounts.length > 0) {
        setIsCheckingBalance(true);
        try {
          const balance = await voiceMemoryService.checkAccountBalance(accounts[0]);
          setBalanceInfo(balance);
          setShowDemoOption(balance.needsFunding);
        } catch (error) {
          console.error('Failed to check balance:', error);
          setBalanceInfo({ balance: 0, needsFunding: true });
          setShowDemoOption(true);
        } finally {
          setIsCheckingBalance(false);
        }
      }
    };

    checkBalance();
  }, [accounts]);

  const handleUpload = async (useDemoMode: boolean = false) => {
    if (!audioBlob || !title.trim() || (!peraWallet && !useDemoMode)) {
      setError('Please complete all required fields');
      return;
    }

    // Check balance before attempting upload (unless using demo mode)
    if (!useDemoMode && balanceInfo?.needsFunding) {
      setError(`Insufficient ALGO balance (${balanceInfo.balance.toFixed(2)} ALGO). Please fund your wallet with test ALGOs or try Demo Mode.`);
      return;
    }
    
    setIsUploading(true);
    setError(null);
    setSuccess(null);
    
    try {
      let signer: any = null;
      
      if (!useDemoMode) {
        // Create signer function for Pera Wallet
        signer = async (txns: any[]) => {
          try {
            const transactionsWithSigner = txns.map(txn => ({ txn }));
            const signedTxns = await peraWallet!.signTransaction(transactionsWithSigner);
            return signedTxns;
          } catch (signerError: any) {
            if (signerError.message?.includes('cancelled') || signerError.message?.includes('rejected')) {
              throw new Error('Transaction was cancelled by user');
            }
            throw new Error(`Failed to sign transaction: ${signerError.message}`);
          }
        };
      }

      const result = await voiceMemoryService.createVoiceMemory(
        {
          title: title.trim(),
          note: message.trim() || undefined,
          unlockDate,
          audioBlob,
          emotion: emotion || { tone: 'Neutral', intensity: 0.5 }
        },
        accounts[0],
        signer,
        useDemoMode
      );

      if (result.success) {
        // Reset form
        setTitle('');
        setMessage('');
        clearRecording();
        setEmotion(null);
        
        // Show success message
        const modeText = result.isDemoMode ? ' (Demo Mode)' : '';
        setSuccess(`Your whisper has been locked in time's embrace${modeText}! Contract ID: ${result.contractId}`);
        
        // Refresh balance after successful transaction (if not demo mode)
        if (!useDemoMode) {
          try {
            const newBalance = await voiceMemoryService.checkAccountBalance(accounts[0]);
            setBalanceInfo(newBalance);
          } catch (error) {
            console.error('Failed to refresh balance:', error);
          }
        }
        
        // Auto-clear success message after 10 seconds
        setTimeout(() => setSuccess(null), 10000);
      }
    } catch (error: any) {
      console.error('Upload failed:', error);
      
      // Handle specific error types
      if (error.message?.includes('cancelled') || error.message?.includes('rejected')) {
        setError('Transaction was cancelled. Your memory was not created.');
      } else if (error.message?.includes('Insufficient ALGO balance')) {
        setError(error.message);
        setShowDemoOption(true);
      } else if (error.message?.includes('IPFS') || error.message?.includes('Pinata')) {
        setError('Failed to store your memory securely. Please check your internet connection and try again.');
      } else {
        setError(error.message || 'The cosmos rejected your offering. Please try again.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const refreshBalance = async () => {
    if (accounts.length > 0) {
      setIsCheckingBalance(true);
      try {
        const balance = await voiceMemoryService.checkAccountBalance(accounts[0]);
        setBalanceInfo(balance);
        setShowDemoOption(balance.needsFunding);
        if (!balance.needsFunding) {
          setError(null); // Clear any balance-related errors
        }
      } catch (error) {
        console.error('Failed to refresh balance:', error);
      } finally {
        setIsCheckingBalance(false);
      }
    }
  };

  const getEmotionWhisper = (tone: string) => {
    const whispers: Record<string, string> = {
      'Hopeful': 'Your voice carries tomorrow\'s light',
      'Joyful': 'Laughter echoes through the stars',
      'Nostalgic': 'Memory wrapped in golden mist',
      'Peaceful': 'Serenity flows like starlight',
      'Excited': 'Energy dancing with cosmos',
      'Grateful': 'Thankfulness blooming like dawn'
    };
    return whispers[tone] || 'Your emotion flows like stardust';
  };

  const clearError = () => setError(null);
  const clearSuccess = () => setSuccess(null);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-16">
        <h1 className="text-5xl md:text-6xl font-display font-light text-starlight-100 mb-6 text-glow-soft">
          Whisper to Tomorrow
        </h1>
        <p className="text-xl text-starlight-400 max-w-3xl mx-auto font-serif italic poetry-spacing">
          Record a message for your future self or beloved souls. 
          Choose the sacred moment when time itself will release your words back to the world.
        </p>
      </div>

      {/* Balance Status */}
      {balanceInfo && (
        <div className={`glass-soft p-6 border mb-8 max-w-2xl mx-auto ${
          balanceInfo.needsFunding 
            ? 'border-nebula-500/30' 
            : 'border-aurora-500/30'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Wallet className={`h-5 w-5 ${
                balanceInfo.needsFunding ? 'text-nebula-400' : 'text-aurora-400'
              }`} />
              <div>
                <span className="font-serif font-medium text-starlight-200">
                  Wallet Balance: {balanceInfo.balance.toFixed(2)} ALGO
                </span>
                {balanceInfo.needsFunding && (
                  <p className="text-sm text-nebula-300 mt-1">
                    Minimum 1 ALGO required for blockchain transactions
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={refreshBalance}
                disabled={isCheckingBalance}
                className="text-starlight-400 hover:text-starlight-200 transition-colors text-sm font-serif"
              >
                {isCheckingBalance ? 'Checking...' : 'Refresh'}
              </button>
              {balanceInfo.needsFunding && (
                <a
                  href="https://testnet.algoexplorer.io/dispenser"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 text-aurora-400 hover:text-aurora-300 transition-colors text-sm font-serif"
                >
                  <span>Get Test ALGOs</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Demo Mode Option */}
      {showDemoOption && (
        <div className="glass-soft p-6 border border-gold-500/30 mb-8 max-w-2xl mx-auto">
          <div className="flex items-start space-x-3">
            <Zap className="h-5 w-5 text-gold-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <span className="font-serif font-medium text-gold-300">Try Demo Mode</span>
              <p className="text-starlight-300 font-serif mt-2">
                Experience ChronoLock without needing ALGO! Demo mode simulates the full experience using local storage instead of the blockchain.
              </p>
              <div className="mt-4 text-sm text-starlight-400 font-serif">
                <strong>Demo Mode Features:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Full voice recording and emotion analysis</li>
                  <li>Time-locked memories (simulated)</li>
                  <li>Beautiful playback experience</li>
                  <li>No blockchain transactions required</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Display */}
      {success && (
        <div className="glass-soft p-6 border border-aurora-500/30 mb-8 max-w-2xl mx-auto">
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-aurora-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <span className="font-serif font-medium text-aurora-300">Memory Created Successfully!</span>
              <p className="text-starlight-300 font-serif mt-2">{success}</p>
            </div>
            <button
              onClick={clearSuccess}
              className="text-starlight-400 hover:text-starlight-200 transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="glass-soft p-6 border border-nebula-500/30 mb-8 max-w-2xl mx-auto">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-nebula-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <span className="font-serif font-medium text-nebula-300">Cosmic Interference</span>
              <p className="text-starlight-400 font-serif mt-2">{error}</p>
              {error.includes('Insufficient ALGO balance') && (
                <div className="mt-4 p-4 bg-white/[0.02] rounded-lg border border-white/[0.08]">
                  <p className="text-sm text-starlight-300 font-serif mb-3">
                    <strong>Options to continue:</strong>
                  </p>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-starlight-400 font-serif mb-2">
                        <strong>Option 1: Get test ALGOs (Full blockchain experience)</strong>
                      </p>
                      <ol className="text-sm text-starlight-400 font-serif space-y-1 list-decimal list-inside ml-4">
                        <li>Copy your wallet address: <code className="bg-white/[0.1] px-2 py-1 rounded text-xs">{accounts[0]?.substring(0, 10)}...</code></li>
                        <li>Visit the <a href="https://testnet.algoexplorer.io/dispenser" target="_blank" rel="noopener noreferrer" className="text-aurora-400 hover:text-aurora-300 underline">Algorand TestNet Dispenser</a></li>
                        <li>Paste your address and request test ALGOs</li>
                        <li>Wait a few moments, then click "Refresh" above</li>
                      </ol>
                    </div>
                    <div>
                      <p className="text-sm text-starlight-400 font-serif">
                        <strong>Option 2: Use Demo Mode (No ALGO required)</strong> - Try the full experience without blockchain transactions
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={clearError}
              className="text-starlight-400 hover:text-starlight-200 transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-12">
        {/* Recording Section */}
        <div className="glass-soft p-12">
          <h2 className="text-3xl font-display font-light text-starlight-100 mb-8 flex items-center">
            <Mic className="h-8 w-8 mr-4 text-cosmos-400" />
            Your Voice, Preserved
          </h2>

          {/* Waveform Visualizer */}
          <div className="mb-12">
            <WaveformVisualizer />
          </div>

          {/* Recording Controls */}
          <div className="flex justify-center space-x-6 mb-8">
            {!isRecording && !audioBlob && (
              <button
                onClick={startRecording}
                className="group button-primary px-10 py-6 font-serif font-medium text-lg transition-all duration-500"
              >
                <div className="flex items-center space-x-3">
                  <Mic className="h-6 w-6" />
                  <span>Begin Recording</span>
                </div>
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="text-whisper text-sm">Speak from your heart</span>
                </div>
              </button>
            )}

            {isRecording && (
              <button
                onClick={stopRecording}
                className="button-ethereal px-10 py-6 font-serif font-medium text-lg transition-all duration-500 animate-pulse-gentle"
              >
                <div className="flex items-center space-x-3">
                  <Square className="h-6 w-6" />
                  <span>Complete Recording</span>
                </div>
              </button>
            )}

            {audioBlob && (
              <div className="flex flex-col items-center space-y-4">
                <audio controls src={audioUrl || undefined} className="rounded-2xl glass-soft p-2" />
                <button
                  onClick={clearRecording}
                  className="flex items-center space-x-2 text-starlight-400 hover:text-starlight-200 transition-colors font-serif"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Clear & Start Over</span>
                </button>
              </div>
            )}
          </div>

          {/* Emotion Analysis */}
          {audioBlob && <EmotionAnalysis audioBlob={audioBlob} onAnalysisComplete={setEmotion} />}
        </div>

        {/* Configuration Section */}
        <div className="glass-soft p-12">
          <h2 className="text-3xl font-display font-light text-starlight-100 mb-8 flex items-center">
            <Lock className="h-8 w-8 mr-4 text-cosmos-400" />
            Sacred Details
          </h2>

          <div className="space-y-8">
            {/* Title */}
            <div>
              <label className="block text-lg font-serif text-starlight-200 mb-3">
                Memory Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Birthday wishes for my future self..."
                className="w-full px-6 py-4 rounded-2xl bg-white/[0.04] border border-white/[0.12] text-starlight-100 placeholder-starlight-500 focus:ring-2 focus:ring-cosmos-500/50 focus:border-transparent transition-all font-serif"
                required
                maxLength={100}
              />
              <p className="text-whisper mt-2">Give your whisper a name to remember ({title.length}/100)</p>
            </div>

            {/* Message */}
            <div>
              <label className="block text-lg font-serif text-starlight-200 mb-3">
                Accompanying Note
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add context, feelings, or hopes for when this message is unlocked..."
                rows={4}
                className="w-full px-6 py-4 rounded-2xl bg-white/[0.04] border border-white/[0.12] text-starlight-100 placeholder-starlight-500 focus:ring-2 focus:ring-cosmos-500/50 focus:border-transparent transition-all font-serif poetry-spacing"
                maxLength={500}
              />
              <p className="text-whisper mt-2">Optional words to accompany your voice ({message.length}/500)</p>
            </div>

            {/* Date Picker */}
            <div>
              <label className="block text-lg font-serif text-starlight-200 mb-3 flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Unlock Date *
              </label>
              <DatePicker value={unlockDate} onChange={setUnlockDate} />
            </div>

            {/* Emotion Display */}
            {emotion && (
              <div className="glass-soft p-6 border border-cosmos-500/30">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-serif text-starlight-200">Detected Emotion:</span>
                  <div className="flex items-center space-x-3">
                    <Star className="h-5 w-5 text-gold-400" />
                    <span className="text-cosmos-300 font-serif font-medium text-lg">{emotion.tone}</span>
                  </div>
                </div>
                <div className="w-full h-2 bg-white/[0.1] rounded-full overflow-hidden mb-3">
                  <div 
                    className="h-full bg-gradient-to-r from-cosmos-500 to-nebula-500 transition-all duration-500"
                    style={{ width: `${emotion.intensity * 100}%` }}
                  />
                </div>
                <p className="text-whisper">
                  {getEmotionWhisper(emotion.tone)}
                </p>
              </div>
            )}

            {/* Upload Buttons */}
            <div className="space-y-4">
              {/* Primary Upload Button */}
              <button
                onClick={() => handleUpload(false)}
                disabled={!audioBlob || !title.trim() || isUploading || balanceInfo?.needsFunding}
                className="w-full button-primary px-8 py-6 font-serif font-medium text-lg transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none group"
              >
                {isUploading ? (
                  <div className="flex items-center justify-center space-x-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    <span>Weaving into Time...</span>
                  </div>
                ) : balanceInfo?.needsFunding ? (
                  <div className="flex items-center justify-center space-x-3">
                    <Wallet className="h-6 w-6" />
                    <span>Fund Wallet for Blockchain</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-3">
                    <Upload className="h-6 w-6" />
                    <span>Lock in Time's Embrace</span>
                    <Moon className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                )}
                {!isUploading && !balanceInfo?.needsFunding && (
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="text-whisper text-sm">Full blockchain experience</span>
                  </div>
                )}
              </button>

              {/* Demo Mode Button */}
              {showDemoOption && (
                <button
                  onClick={() => handleUpload(true)}
                  disabled={!audioBlob || !title.trim() || isUploading}
                  className="w-full button-ethereal px-8 py-6 font-serif font-medium text-lg transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {isUploading ? (
                    <div className="flex items-center justify-center space-x-3">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-starlight-300"></div>
                      <span>Creating Demo Memory...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-3">
                      <Zap className="h-6 w-6" />
                      <span>Try Demo Mode</span>
                      <Star className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  )}
                  {!isUploading && (
                    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <span className="text-whisper text-sm">No ALGO required</span>
                    </div>
                  )}
                </button>
              )}
            </div>

            {/* Requirements */}
            <div className="glass-soft p-4 border border-white/[0.08]">
              <p className="text-sm text-starlight-400 font-serif">
                <strong>Requirements:</strong> Voice recording, memory title, and unlock date. 
                {showDemoOption ? (
                  <>
                    <br />
                    <strong>Blockchain Mode:</strong> Requires 1+ ALGO. Memories stored on Algorand + IPFS.
                    <br />
                    <strong>Demo Mode:</strong> No ALGO required. Memories stored locally for testing.
                  </>
                ) : (
                  ' Your memory will be encrypted and stored on IPFS, with a time-lock contract on Algorand.'
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecordPage;