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
        <div className="relative w-20 h-20">
          {/* White Circle Background */}
          <div className="w-full h-full bg-white rounded-full shadow-lg group-hover:shadow-xl transition-all duration-300">
            {/* Circular Text */}
            <svg className="w-full h-full" viewBox="0 0 100 100">
              {/* Define the circular path for text */}
              <defs>
                <path
                  id="circle-path"
                  d="M 50, 50 m -35, 0 a 35,35 0 1,1 70,0 a 35,35 0 1,1 -70,0"
                />
              </defs>
              
              {/* Circular Text */}
              <text className="fill-black text-[6px] font-bold tracking-wider">
                <textPath href="#circle-path" startOffset="0%">
                  POWERED BY BOLT.NEW MADE IN BOLT.NEW
                </textPath>
              </text>
            </svg>
            
            {/* Central Bolt Logo */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-black font-black text-2xl transform -skew-x-12">
                b
              </div>
            </div>
          </div>
        </div>
      </a>
    </div>
  );
};

export default BoltVerifiedBadge;