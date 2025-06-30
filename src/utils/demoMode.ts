/**
 * Demo mode utilities for testing without ALGO
 */
export class DemoModeManager {
  private static readonly DEMO_STORAGE_KEY = 'chronolock_demo_memories';

  /**
   * Create a demo voice memory (simulates blockchain without real transactions)
   */
  static async createDemoMemory(
    request: {
      title: string;
      note?: string;
      unlockDate: Date;
      audioBlob: Blob;
      emotion: { tone: string; intensity: number };
    },
    userAddress: string
  ): Promise<{ success: boolean; memoryId: string; contractId: number }> {
    try {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate mock contract ID
      const contractId = Math.floor(Math.random() * 1000000) + 100000;
      const memoryId = `demo_${Date.now()}_${Math.random().toString(36).substring(2)}`;

      // Store audio as base64 in localStorage (for demo only)
      const audioBase64 = await this.blobToBase64(request.audioBlob);
      
      const demoMemory = {
        id: memoryId,
        title: request.title,
        note: request.note,
        unlockDate: request.unlockDate.toISOString(),
        createdDate: new Date().toISOString(),
        emotion: request.emotion,
        duration: await this.getAudioDuration(request.audioBlob),
        isLocked: new Date() < request.unlockDate,
        contractId,
        audioData: audioBase64,
        userAddress,
        isDemoMode: true
      };

      this.storeDemoMemory(demoMemory);

      return {
        success: true,
        memoryId,
        contractId
      };
    } catch (error) {
      console.error('Demo memory creation failed:', error);
      throw new Error('Failed to create demo memory');
    }
  }

  /**
   * Get demo memories for a user
   */
  static getDemoMemories(userAddress: string): any[] {
    try {
      const stored = JSON.parse(localStorage.getItem(this.DEMO_STORAGE_KEY) || '[]');
      return stored
        .filter((memory: any) => memory.userAddress === userAddress)
        .map((memory: any) => ({
          ...memory,
          unlockDate: new Date(memory.unlockDate),
          createdDate: new Date(memory.createdDate),
          isLocked: new Date() < new Date(memory.unlockDate)
        }))
        .sort((a: any, b: any) => b.createdDate.getTime() - a.createdDate.getTime());
    } catch (error) {
      console.error('Failed to get demo memories:', error);
      return [];
    }
  }

  /**
   * Retrieve demo memory audio
   */
  static async retrieveDemoMemory(memoryId: string, userAddress: string): Promise<Blob | null> {
    try {
      const memories = this.getDemoMemories(userAddress);
      const memory = memories.find(m => m.id === memoryId);
      
      if (!memory || !memory.audioData) {
        throw new Error('Demo memory not found');
      }

      if (memory.isLocked) {
        throw new Error('Memory is still time-locked');
      }

      // Convert base64 back to blob
      return this.base64ToBlob(memory.audioData);
    } catch (error) {
      console.error('Failed to retrieve demo memory:', error);
      throw error;
    }
  }

  /**
   * Check if demo memory is unlocked
   */
  static isDemoMemoryUnlocked(memoryId: string, userAddress: string): boolean {
    const memories = this.getDemoMemories(userAddress);
    const memory = memories.find(m => m.id === memoryId);
    return memory ? !memory.isLocked : false;
  }

  /**
   * Clear all demo memories
   */
  static clearDemoMemories(): void {
    localStorage.removeItem(this.DEMO_STORAGE_KEY);
  }

  // Helper methods
  private static storeDemoMemory(memory: any): void {
    try {
      const existing = JSON.parse(localStorage.getItem(this.DEMO_STORAGE_KEY) || '[]');
      existing.push(memory);
      localStorage.setItem(this.DEMO_STORAGE_KEY, JSON.stringify(existing));
    } catch (error) {
      console.error('Failed to store demo memory:', error);
    }
  }

  private static async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data:audio/wav;base64, prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private static base64ToBlob(base64: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: 'audio/wav' });
  }

  private static async getAudioDuration(audioBlob: Blob): Promise<number> {
    return new Promise((resolve) => {
      const audio = new Audio();
      const timeout = setTimeout(() => resolve(0), 5000);
      
      audio.addEventListener('loadedmetadata', () => {
        clearTimeout(timeout);
        resolve(Math.floor(audio.duration) || 0);
      });
      
      audio.addEventListener('error', () => {
        clearTimeout(timeout);
        resolve(0);
      });
      
      audio.src = URL.createObjectURL(audioBlob);
    });
  }
}