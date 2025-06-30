import { EncryptionManager } from '../utils/encryption';
import { IPFSManager } from '../utils/ipfs';
import { AlgorandManager } from '../utils/algorand';
import { DemoModeManager } from '../utils/demoMode';

export interface CreateMemoryRequest {
  title: string;
  note?: string;
  unlockDate: Date;
  audioBlob: Blob;
  emotion: {
    tone: string;
    intensity: number;
  };
}

export interface VoiceMemory {
  id: string;
  title: string;
  note?: string;
  unlockDate: Date;
  createdDate: Date;
  emotion: {
    tone: string;
    intensity: number;
  };
  duration: number;
  isLocked: boolean;
  ipfsCid?: string;
  contractId: number;
  encryptionKey?: string; // Base64 encoded key for the owner
  isDemoMode?: boolean;
}

export class VoiceMemoryService {
  private algorandManager: AlgorandManager;

  constructor() {
    this.algorandManager = new AlgorandManager();
  }

  /**
   * Check account balance and funding requirements
   */
  async checkAccountBalance(userAddress: string): Promise<{ balance: number; needsFunding: boolean }> {
    return await this.algorandManager.checkAccountBalance(userAddress);
  }

  /**
   * Create and store a new voice memory (with demo mode fallback)
   */
  async createVoiceMemory(
    request: CreateMemoryRequest,
    userAddress: string,
    signer: (txns: any[]) => Promise<Uint8Array[]>,
    forceDemoMode: boolean = false
  ): Promise<{ success: boolean; memoryId: string; contractId: number; isDemoMode?: boolean }> {
    try {
      // Validate inputs
      if (!request.title?.trim()) {
        throw new Error('Memory title is required');
      }
      
      if (!request.audioBlob || request.audioBlob.size === 0) {
        throw new Error('Audio recording is required');
      }
      
      if (request.unlockDate <= new Date()) {
        throw new Error('Unlock date must be in the future');
      }

      // Check if we should use demo mode
      let useDemoMode = forceDemoMode;
      
      if (!useDemoMode) {
        try {
          const balanceInfo = await this.checkAccountBalance(userAddress);
          if (balanceInfo.needsFunding) {
            // Offer demo mode as alternative
            throw new Error('INSUFFICIENT_BALANCE');
          }
        } catch (error: any) {
          if (error.message === 'INSUFFICIENT_BALANCE') {
            throw error;
          }
          // Network issues - offer demo mode
          useDemoMode = true;
        }
      }

      if (useDemoMode) {
        // Use demo mode
        const result = await DemoModeManager.createDemoMemory(request, userAddress);
        return {
          ...result,
          isDemoMode: true
        };
      }

      // Original blockchain implementation
      const encryptionKey = await EncryptionManager.generateKey();
      const { encryptedData, iv } = await EncryptionManager.encryptAudio(request.audioBlob, encryptionKey);
      const exportedKey = await EncryptionManager.exportKey(encryptionKey);
      const keyBase64 = btoa(String.fromCharCode(...exportedKey));
      const ivBase64 = btoa(String.fromCharCode(...iv));

      const ipfsCid = await IPFSManager.uploadToIPFS(encryptedData, {
        title: request.title,
        note: request.note,
        emotion: request.emotion,
        createdAt: new Date().toISOString(),
        encryptionIv: ivBase64
      });

      const unlockTimestamp = Math.floor(request.unlockDate.getTime() / 1000);
      const contractId = await this.algorandManager.createVoiceMemoryContract(
        userAddress,
        unlockTimestamp,
        ipfsCid,
        request.emotion,
        signer
      );

      const memoryId = `memory_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      
      const memoryData: VoiceMemory = {
        id: memoryId,
        title: request.title.trim(),
        note: request.note?.trim(),
        unlockDate: request.unlockDate,
        createdDate: new Date(),
        emotion: request.emotion,
        duration: await this.getAudioDuration(request.audioBlob),
        isLocked: new Date() < request.unlockDate,
        ipfsCid,
        contractId,
        encryptionKey: keyBase64
      };

      this.storeMemoryLocally(userAddress, memoryData);

      return {
        success: true,
        memoryId,
        contractId
      };

    } catch (error: any) {
      console.error('Failed to create voice memory:', error);
      
      if (error.message === 'INSUFFICIENT_BALANCE') {
        throw new Error('Insufficient ALGO balance. You can try Demo Mode instead, which simulates the experience without requiring ALGO.');
      }
      
      if (error.message?.includes('insufficient funds') || error.message?.includes('overspend')) {
        throw new Error('Insufficient ALGO balance. Please fund your wallet with test ALGOs or try Demo Mode.');
      }
      
      if (error.message?.includes('IPFS')) {
        throw new Error('Failed to store your memory securely. Please check your internet connection and try again.');
      }
      
      throw new Error(error.message || 'Failed to create your voice memory. Please try again.');
    }
  }

  /**
   * Get user's voice memories (including demo memories)
   */
  async getUserMemories(userAddress: string): Promise<VoiceMemory[]> {
    try {
      // Get blockchain memories
      const localMemories = this.getLocalMemories(userAddress);
      const contractMemories = await this.algorandManager.getUserVoiceMemories(userAddress);
      
      // Get demo memories
      const demoMemories = DemoModeManager.getDemoMemories(userAddress).map((demo: any) => ({
        id: demo.id,
        title: demo.title,
        note: demo.note,
        unlockDate: demo.unlockDate,
        createdDate: demo.createdDate,
        emotion: demo.emotion,
        duration: demo.duration,
        isLocked: demo.isLocked,
        contractId: demo.contractId,
        isDemoMode: true
      }));

      // Merge all memories
      const allMemories = [...localMemories, ...demoMemories];
      
      for (const contractMemory of contractMemories) {
        const existingMemory = localMemories.find(m => m.contractId === contractMemory.appId);
        if (!existingMemory) {
          const memory: VoiceMemory = {
            id: `contract_${contractMemory.appId}`,
            title: `Memory #${contractMemory.appId}`,
            unlockDate: new Date(contractMemory.unlockTimestamp * 1000),
            createdDate: new Date(),
            emotion: contractMemory.emotionData,
            duration: 0,
            isLocked: contractMemory.isLocked,
            ipfsCid: contractMemory.ipfsCid,
            contractId: contractMemory.appId
          };
          allMemories.push(memory);
        }
      }

      // Update lock status and sort
      const currentTime = new Date();
      return allMemories.map(memory => ({
        ...memory,
        isLocked: currentTime < memory.unlockDate
      })).sort((a, b) => b.createdDate.getTime() - a.createdDate.getTime());

    } catch (error) {
      console.error('Failed to get user memories:', error);
      // Return demo memories if blockchain fails
      return DemoModeManager.getDemoMemories(userAddress).map((demo: any) => ({
        ...demo,
        isDemoMode: true
      }));
    }
  }

  /**
   * Retrieve and decrypt a voice memory (including demo memories)
   */
  async retrieveVoiceMemory(memoryId: string, userAddress: string): Promise<Blob | null> {
    try {
      // Check if it's a demo memory
      if (memoryId.startsWith('demo_')) {
        return await DemoModeManager.retrieveDemoMemory(memoryId, userAddress);
      }

      // Original blockchain implementation
      const memories = this.getLocalMemories(userAddress);
      const memory = memories.find(m => m.id === memoryId);
      
      if (!memory || !memory.encryptionKey) {
        throw new Error('Memory not found or encryption key missing');
      }

      if (memory.isLocked) {
        const isUnlocked = await this.algorandManager.isMemoryUnlocked(memory.contractId);
        if (!isUnlocked) {
          throw new Error('Memory is still time-locked');
        }
      }

      const encryptedData = await IPFSManager.retrieveFromIPFS(memory.ipfsCid!);
      const keyBytes = new Uint8Array(atob(memory.encryptionKey).split('').map(c => c.charCodeAt(0)));
      const encryptionKey = await EncryptionManager.importKey(keyBytes);
      
      const metadata = await IPFSManager.getIPFSMetadata(memory.ipfsCid!);
      const ivBase64 = metadata.keyvalues?.encryptionIv || '';
      
      if (!ivBase64) {
        throw new Error('Encryption IV not found - cannot decrypt memory');
      }
      
      const iv = new Uint8Array(atob(ivBase64).split('').map(c => c.charCodeAt(0)));
      const decryptedBlob = await EncryptionManager.decryptAudio(encryptedData, encryptionKey, iv);

      return decryptedBlob;

    } catch (error: any) {
      console.error('Failed to retrieve voice memory:', error);
      throw new Error(`Failed to retrieve your memory: ${error.message}`);
    }
  }

  /**
   * Check if a memory is unlocked (including demo memories)
   */
  async checkMemoryUnlockStatus(contractId: number, memoryId?: string, userAddress?: string): Promise<boolean> {
    try {
      // Check if it's a demo memory
      if (memoryId?.startsWith('demo_') && userAddress) {
        return DemoModeManager.isDemoMemoryUnlocked(memoryId, userAddress);
      }

      return await this.algorandManager.isMemoryUnlocked(contractId);
    } catch (error) {
      console.error('Failed to check unlock status:', error);
      return false;
    }
  }

  private async getAudioDuration(audioBlob: Blob): Promise<number> {
    return new Promise((resolve) => {
      const audio = new Audio();
      const timeout = setTimeout(() => {
        resolve(0);
      }, 5000);
      
      audio.addEventListener('loadedmetadata', () => {
        clearTimeout(timeout);
        resolve(Math.floor(audio.duration) || 0);
      });
      
      audio.addEventListener('error', () => {
        clearTimeout(timeout);
        resolve(0);
      });
      
      try {
        audio.src = URL.createObjectURL(audioBlob);
      } catch (error) {
        clearTimeout(timeout);
        resolve(0);
      }
    });
  }

  private storeMemoryLocally(userAddress: string, memory: VoiceMemory): void {
    try {
      const key = `chronolock_memories_${userAddress}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      
      if (existing.length >= 100) {
        existing.shift();
      }
      
      existing.push({
        ...memory,
        unlockDate: memory.unlockDate.toISOString(),
        createdDate: memory.createdDate.toISOString()
      });
      
      localStorage.setItem(key, JSON.stringify(existing));
    } catch (error) {
      console.error('Failed to store memory locally:', error);
    }
  }

  private getLocalMemories(userAddress: string): VoiceMemory[] {
    try {
      const key = `chronolock_memories_${userAddress}`;
      const stored = JSON.parse(localStorage.getItem(key) || '[]');
      
      return stored.map((item: any) => ({
        ...item,
        unlockDate: new Date(item.unlockDate),
        createdDate: new Date(item.createdDate)
      })).filter((memory: VoiceMemory) => {
        return memory.id && memory.title && memory.unlockDate instanceof Date && !isNaN(memory.unlockDate.getTime());
      });
    } catch (error) {
      console.error('Failed to get local memories:', error);
      return [];
    }
  }

  clearLocalMemories(userAddress: string): void {
    try {
      const key = `chronolock_memories_${userAddress}`;
      localStorage.removeItem(key);
      DemoModeManager.clearDemoMemories();
    } catch (error) {
      console.error('Failed to clear local memories:', error);
    }
  }
}