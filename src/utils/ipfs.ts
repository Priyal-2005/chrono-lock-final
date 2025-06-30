/**
 * IPFS utilities for storing encrypted voice memories
 */
export class IPFSManager {
  private static readonly IPFS_GATEWAY = import.meta.env.VITE_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs/';
  private static readonly PINATA_API_URL = 'https://api.pinata.cloud';

  /**
   * Upload encrypted audio to IPFS via Pinata
   */
  static async uploadToIPFS(
    encryptedAudio: Uint8Array,
    metadata: {
      title: string;
      note?: string;
      emotion: { tone: string; intensity: number };
      createdAt: string;
      encryptionIv: string;
    }
  ): Promise<string> {
    try {
      // Check if JWT token is available
      const jwtToken = import.meta.env.VITE_PINATA_JWT;
      if (!jwtToken) {
        throw new Error('Pinata JWT token is not configured. Please set VITE_PINATA_JWT in your environment variables.');
      }

      // Validate audio size (max 25MB for Pinata free tier)
      const maxSize = 25 * 1024 * 1024; // 25MB
      if (encryptedAudio.length > maxSize) {
        throw new Error('Audio file is too large. Please record a shorter message.');
      }

      // Create FormData for file upload
      const formData = new FormData();
      
      // Create a blob from the encrypted audio
      const audioBlob = new Blob([encryptedAudio], { type: 'application/octet-stream' });
      formData.append('file', audioBlob, `chronolock-memory-${Date.now()}.bin`);

      // Add metadata
      const pinataMetadata = JSON.stringify({
        name: `ChronoLock Memory: ${metadata.title}`,
        keyvalues: {
          app: 'chronolock',
          version: '1.0.0',
          title: metadata.title.substring(0, 100), // Limit length
          note: (metadata.note || '').substring(0, 200),
          emotionTone: metadata.emotion.tone,
          emotionIntensity: metadata.emotion.intensity.toString(),
          createdAt: metadata.createdAt,
          encryptionIv: metadata.encryptionIv,
          type: 'voice-memory'
        }
      });
      
      formData.append('pinataMetadata', pinataMetadata);

      // Pin options for better reliability
      const pinataOptions = JSON.stringify({
        cidVersion: 1,
        customPinPolicy: {
          regions: [
            { id: 'FRA1', desiredReplicationCount: 1 },
            { id: 'NYC1', desiredReplicationCount: 1 }
          ]
        }
      });
      
      formData.append('pinataOptions', pinataOptions);

      // Upload to IPFS via Pinata with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      try {
        const response = await fetch(`${this.PINATA_API_URL}/pinning/pinFileToIPFS`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${jwtToken}`,
          },
          body: formData,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `IPFS upload failed: ${response.status} ${response.statusText}`;
          
          try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.error) {
              errorMessage += ` - ${errorJson.error}`;
            }
          } catch {
            errorMessage += ` - ${errorText}`;
          }
          
          throw new Error(errorMessage);
        }

        const result = await response.json();
        
        if (!result.IpfsHash) {
          throw new Error('Invalid response from IPFS service - no hash returned');
        }

        return result.IpfsHash;

      } catch (error: any) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          throw new Error('Upload timeout - please try again with a shorter recording');
        }
        
        throw error;
      }

    } catch (error: any) {
      console.error('IPFS upload error:', error);
      
      // Re-throw with user-friendly message
      if (error.message.includes('JWT') || error.message.includes('401')) {
        throw new Error('IPFS service authentication failed. Please check your configuration.');
      }
      
      throw new Error(`Failed to store your memory securely: ${error.message}`);
    }
  }

  /**
   * Retrieve encrypted audio from IPFS
   */
  static async retrieveFromIPFS(cid: string): Promise<Uint8Array> {
    try {
      // Validate CID format
      if (!cid || cid.length < 10) {
        throw new Error('Invalid IPFS content identifier');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        const response = await fetch(`${this.IPFS_GATEWAY}${cid}`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Failed to retrieve from IPFS: ${response.status} ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        
        if (arrayBuffer.byteLength === 0) {
          throw new Error('Retrieved file is empty');
        }

        return new Uint8Array(arrayBuffer);

      } catch (error: any) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          throw new Error('Download timeout - please try again');
        }
        
        throw error;
      }

    } catch (error: any) {
      console.error('IPFS retrieval error:', error);
      throw new Error(`Failed to retrieve your memory: ${error.message}`);
    }
  }

  /**
   * Get metadata for an IPFS file
   */
  static async getIPFSMetadata(cid: string): Promise<any> {
    try {
      const jwtToken = import.meta.env.VITE_PINATA_JWT;
      if (!jwtToken) {
        console.warn('Pinata JWT token not configured for metadata retrieval');
        return {};
      }

      const response = await fetch(`${this.PINATA_API_URL}/data/pinList?hashContains=${cid}&status=pinned`, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
        }
      });

      if (!response.ok) {
        console.warn(`Failed to get IPFS metadata: ${response.statusText}`);
        return {};
      }

      const result = await response.json();
      return result.rows?.[0]?.metadata || {};

    } catch (error) {
      console.error('IPFS metadata error:', error);
      return {};
    }
  }

  /**
   * Validate IPFS service connectivity
   */
  static async validateService(): Promise<{ connected: boolean; error?: string }> {
    try {
      const jwtToken = import.meta.env.VITE_PINATA_JWT;
      if (!jwtToken) {
        return { connected: false, error: 'IPFS service not configured' };
      }

      const response = await fetch(`${this.PINATA_API_URL}/data/testAuthentication`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
        }
      });

      if (response.ok) {
        return { connected: true };
      } else {
        return { connected: false, error: `Authentication failed: ${response.statusText}` };
      }

    } catch (error: any) {
      return { connected: false, error: error.message };
    }
  }
}