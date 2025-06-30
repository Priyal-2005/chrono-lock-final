import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Wifi, WifiOff } from 'lucide-react';
import { IPFSManager } from '../utils/ipfs';
import { AlgorandManager } from '../utils/algorand';

const ServiceStatus: React.FC = () => {
  const [ipfsStatus, setIpfsStatus] = useState<{ connected: boolean; error?: string } | null>(null);
  const [algorandStatus, setAlgorandStatus] = useState<{ status: string; lastRound: number } | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    checkServices();
  }, []);

  const checkServices = async () => {
    try {
      // Check IPFS
      const ipfs = await IPFSManager.validateService();
      setIpfsStatus(ipfs);

      // Check Algorand
      const algorandManager = new AlgorandManager();
      const algorand = await algorandManager.getNetworkStatus();
      setAlgorandStatus(algorand);

      // Show status if there are issues
      if (!ipfs.connected || algorand.status !== 'connected') {
        setIsVisible(true);
      }
    } catch (error) {
      console.error('Service check failed:', error);
      setIsVisible(true);
    }
  };

  if (!isVisible || (!ipfsStatus && !algorandStatus)) {
    return null;
  }

  const hasIssues = !ipfsStatus?.connected || algorandStatus?.status !== 'connected';

  if (!hasIssues) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm">
      <div className="glass-soft p-4 border border-nebula-500/30 rounded-2xl">
        <div className="flex items-center space-x-3 mb-3">
          <AlertCircle className="h-5 w-5 text-nebula-400" />
          <span className="font-serif font-medium text-starlight-200">Service Status</span>
          <button
            onClick={() => setIsVisible(false)}
            className="ml-auto text-starlight-400 hover:text-starlight-200 transition-colors"
          >
            ×
          </button>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center space-x-2">
            {ipfsStatus?.connected ? (
              <CheckCircle className="h-4 w-4 text-aurora-400" />
            ) : (
              <WifiOff className="h-4 w-4 text-nebula-400" />
            )}
            <span className="text-starlight-300">
              IPFS Storage: {ipfsStatus?.connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {algorandStatus?.status === 'connected' ? (
              <CheckCircle className="h-4 w-4 text-aurora-400" />
            ) : (
              <WifiOff className="h-4 w-4 text-nebula-400" />
            )}
            <span className="text-starlight-300">
              Algorand Network: {algorandStatus?.status === 'connected' ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          {ipfsStatus?.error && (
            <p className="text-whisper text-xs mt-2">
              IPFS: {ipfsStatus.error}
            </p>
          )}
        </div>
        
        <button
          onClick={checkServices}
          className="mt-3 w-full text-xs text-starlight-400 hover:text-starlight-200 transition-colors font-serif"
        >
          Refresh Status
        </button>
      </div>
    </div>
  );
};

export default ServiceStatus;