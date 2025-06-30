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
        <img 
          src="/white_circle_360x360.png" 
          alt="Powered by Bolt.new" 
          className="w-20 h-20 drop-shadow-lg group-hover:drop-shadow-xl transition-all duration-300"
        />
      </a>
    </div>
  );
};

export default BoltVerifiedBadge;