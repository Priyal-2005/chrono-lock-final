# ChronoLock - Time-Locked Voice Memories

A beautiful, production-ready application for creating encrypted voice messages that unlock at specific dates using Algorand smart contracts and IPFS storage.

## Features

- 🎙️ **Voice Recording** - High-quality audio capture with real-time waveform visualization
- 🔒 **Time-Locked Encryption** - Messages encrypted and locked until a chosen date
- 🌟 **Emotion Analysis** - AI-powered emotion detection from voice recordings
- 🔗 **Blockchain Security** - Algorand smart contracts ensure tamper-proof time locks
- 📦 **Decentralized Storage** - IPFS ensures your memories are preserved forever
- 🎨 **Beautiful UI** - Cosmic-themed design with smooth animations
- 📱 **Responsive Design** - Works perfectly on all devices

## Production Deployment

### Prerequisites

1. **Pinata Account** - Sign up at [pinata.cloud](https://pinata.cloud) for IPFS storage
2. **Pera Wallet** - Users need Pera Wallet for Algorand transactions
3. **Environment Variables** - Configure the required environment variables

### Environment Setup

Create a `.env` file with the following variables:

```env
# Pinata IPFS Configuration
VITE_PINATA_JWT=your_actual_pinata_jwt_token

# IPFS Gateway (optional)
VITE_IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/

# Algorand Configuration
VITE_ALGORAND_NETWORK=testnet
VITE_ALGORAND_NODE_URL=https://testnet-api.algonode.cloud
VITE_ALGORAND_INDEXER_URL=https://testnet-idx.algonode.cloud

# Production flags
VITE_DEV_MODE=false
```

### Getting Your Pinata JWT Token

1. Sign up at [pinata.cloud](https://pinata.cloud)
2. Go to API Keys section
3. Create a new API key with the following permissions:
   - `pinFileToIPFS`
   - `pinByHash`
   - `userPinList`
4. Copy the JWT token to your `.env` file

### Deployment Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

3. **Build for Production**
   ```bash
   npm run build
   ```

4. **Deploy to Your Platform**
   - **Netlify**: Connect your repository and deploy
   - **Vercel**: Import project and deploy
   - **Traditional Hosting**: Upload `dist` folder contents

### Production Checklist

- [ ] Pinata JWT token configured
- [ ] Environment variables set correctly
- [ ] HTTPS enabled (required for audio recording)
- [ ] Service status monitoring enabled
- [ ] Error tracking configured
- [ ] Analytics setup (optional)

## Development

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Architecture

- **Frontend**: React + TypeScript + Tailwind CSS
- **Blockchain**: Algorand (smart contracts for time locks)
- **Storage**: IPFS via Pinata (encrypted audio files)
- **Wallet**: Pera Wallet integration
- **Audio**: Web Audio API for recording and analysis

### Key Components

- `VoiceMemoryService` - Core service for creating and managing memories
- `EncryptionManager` - Client-side encryption for audio files
- `IPFSManager` - IPFS storage and retrieval
- `AlgorandManager` - Smart contract interactions
- `AudioContext` - Audio recording and waveform visualization

## Security Features

- **Client-side Encryption** - Audio encrypted before leaving the device
- **Time-locked Smart Contracts** - Algorand ensures memories unlock only at the right time
- **Decentralized Storage** - IPFS prevents single points of failure
- **No Server Storage** - No audio data stored on application servers

## Browser Compatibility

- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

**Note**: HTTPS is required for audio recording functionality.

## Support

For issues or questions:
1. Check the service status indicator in the bottom-right corner
2. Ensure your Pinata configuration is correct
3. Verify your wallet has sufficient ALGO for transactions
4. Check browser console for detailed error messages

## License

MIT License - see LICENSE file for details.