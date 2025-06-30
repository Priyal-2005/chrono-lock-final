import React from 'react';
import { Zap } from 'lucide-react';

const BoltVerifiedBadge: React.FC = () => {
  return (
    <div className="fixed bottom-6 left-6 z-50 group">
      <a
        href="https://bolt.new/"
        target="_blank"
        rel="noopener noreferrer"
        className="block transition-all duration-300 hover:scale-110"
        title="Powered by Bolt.new"
      >
        <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 border-2 border-white/20">
          <div className="text-center">
            <Zap className="h-6 w-6 text-white mb-1 mx-auto" />
            <div className="text-white font-bold text-xs leading-tight">
              BOLT
            </div>
          </div>
        </div>
      </a>
    </div>
  );
};

export default BoltVerifiedBadge;