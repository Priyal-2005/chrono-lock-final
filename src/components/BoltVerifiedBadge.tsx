import React from 'react';
import { Zap, Shield, CheckCircle } from 'lucide-react';

const BoltVerifiedBadge: React.FC = () => {
  return (
    <div className="fixed bottom-6 left-6 z-50 group">
      <a
        href="https://bolt.new/"
        target="_blank"
        rel="noopener noreferrer"
        className="block transition-all duration-500 hover:scale-110"
        title="Verified by Bolt.new - Built with AI-powered development"
      >
        <div className="relative">
          {/* Clean Badge Container */}
          <div className="relative w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-500">
            {/* Bolt Logo */}
            <div className="flex items-center justify-center">
              <Zap className="h-8 w-8 text-black transition-colors duration-500" />
            </div>
            
            {/* Verification Check */}
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white shadow-md">
              <CheckCircle className="h-3 w-3 text-white" />
            </div>
          </div>
          
          {/* Hover Tooltip */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
            <div className="bg-black/90 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/20 min-w-max">
              <div className="flex items-center space-x-2 text-sm">
                <Shield className="h-4 w-4 text-green-400" />
                <span className="text-white font-medium">Bolt Verified</span>
              </div>
              <p className="text-xs text-gray-300 mt-1">
                Built with AI-powered development
              </p>
            </div>
            {/* Tooltip Arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/90"></div>
          </div>
        </div>
      </a>
    </div>
  );
};

export default BoltVerifiedBadge;