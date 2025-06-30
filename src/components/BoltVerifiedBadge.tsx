import React from 'react';

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
        <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20 group-hover:bg-white/20 transition-all duration-300">
          <div className="text-center">
            <div className="text-white font-bold text-xs leading-tight">
              BUILT
            </div>
            <div className="text-white font-bold text-xs leading-tight">
              WITH
            </div>
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