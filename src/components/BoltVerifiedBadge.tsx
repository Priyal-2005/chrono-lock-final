import React from 'react';
import { Zap, Shield, CheckCircle } from 'lucide-react';

const BoltVerifiedBadge: React.FC = () => {
  return (
    <div className="fixed bottom-6 left-6 z-50 group">
      <a
        href="https://bolt.new/"
        target="_blank"
        rel="noopener noreferrer"
        className="block transition-all duration-500 hover:scale-110 hover:drop-shadow-2xl"
        title="Verified by Bolt.new - Built with AI-powered development"
      >
        <div className="relative">
          {/* Main Badge Container */}
          <div className="relative w-20 h-20 glass-ethereal rounded-full flex items-center justify-center border-2 border-white/20 group-hover:border-white/40 transition-all duration-500 group-hover:shadow-cosmic">
            {/* Background Circle with Image */}
            <div className="absolute inset-0 rounded-full overflow-hidden">
              <img 
                src="/white_circle_360x360.png" 
                alt="Bolt Verified" 
                className="w-full h-full object-cover opacity-10 group-hover:opacity-20 transition-opacity duration-500"
              />
            </div>
            
            {/* Bolt Logo */}
            <div className="relative z-10 flex items-center justify-center">
              <Zap className="h-8 w-8 text-white group-hover:text-gold-300 transition-colors duration-500 drop-shadow-lg" />
            </div>
            
            {/* Verification Check */}
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-aurora-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
              <CheckCircle className="h-3 w-3 text-white" />
            </div>
            
            {/* Animated Ring */}
            <div className="absolute inset-0 rounded-full border-2 border-cosmos-400/30 animate-pulse-gentle"></div>
          </div>
          
          {/* Hover Tooltip */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
            <div className="glass-soft px-4 py-2 rounded-xl border border-white/20 min-w-max">
              <div className="flex items-center space-x-2 text-sm">
                <Shield className="h-4 w-4 text-aurora-400" />
                <span className="text-starlight-200 font-serif font-medium">Bolt Verified</span>
              </div>
              <p className="text-xs text-starlight-400 font-serif mt-1">
                Built with AI-powered development
              </p>
            </div>
            {/* Tooltip Arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white/20"></div>
          </div>
        </div>
      </a>
    </div>
  );
};

export default BoltVerifiedBadge;