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
        <div className="w-16 h-16 transition-all duration-300 group-hover:drop-shadow-lg">
          <img
            src="/assets/black_circle_360x360.png"
            alt="Powered by Bolt.new"
            className="w-full h-full object-contain transition-all duration-300 group-hover:brightness-110"
          />
        </div>
      </a>
    </div>
  );
};

export default BoltVerifiedBadge;