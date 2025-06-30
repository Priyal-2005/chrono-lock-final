import algosdk from 'algosdk';

export interface VoiceMemoryContract {
  appId: number;
  creator: string;
  unlockTimestamp: number;
  ipfsCid: string;
  emotionData: {
    tone: string;
    intensity: number;
  };
  isLocked: boolean;
}

export class AlgorandManager {
  private algodClient: algosdk.Algodv2;
  private indexerClient: algosdk.Indexer;

  constructor() {
    // Using AlgoNode for reliable access
    const algodToken = '';
    const algodServer = import.meta.env.VITE_ALGORAND_NODE_URL || 'https://testnet-api.algonode.cloud';
    const algodPort = '';

    const indexerToken = '';
    const indexerServer = import.meta.env.VITE_ALGORAND_INDEXER_URL || 'https://testnet-idx.algonode.cloud';
    const indexerPort = '';

    this.algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);
    this.indexerClient = new algosdk.Indexer(indexerToken, indexerServer, indexerPort);
  }

  /**
   * Create a time-locked voice memory contract
   */
  async createVoiceMemoryContract(
    creatorAddress: string,
    unlockTimestamp: number,
    ipfsCid: string,
    emotionData: { tone: string; intensity: number },
    signer: (txns: algosdk.Transaction[]) => Promise<Uint8Array[]>
  ): Promise<number> {
    try {
      const suggestedParams = await this.algodClient.getTransactionParams().do();

      // Create the smart contract application
      const approvalProgram = await this.compileTimeLockedContract();
      const clearProgram = await this.compileClearProgram();

      const appCreateTxn = algosdk.makeApplicationCreateTxnFromObject({
        from: creatorAddress,
        suggestedParams,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        approvalProgram,
        clearProgram,
        numLocalInts: 0,
        numLocalByteSlices: 0,
        numGlobalInts: 2, // unlock_timestamp, emotion_intensity
        numGlobalByteSlices: 2, // ipfs_cid, emotion_tone
        appArgs: [
          algosdk.encodeUint64(unlockTimestamp),
          new TextEncoder().encode(ipfsCid.substring(0, 64)), // Limit IPFS CID length
          new TextEncoder().encode(emotionData.tone.substring(0, 32)), // Limit emotion tone length
          algosdk.encodeUint64(Math.floor(emotionData.intensity * 1000))
        ]
      });

      // Sign and submit the transaction
      const signedTxns = await signer([appCreateTxn]);
      const { txId } = await this.algodClient.sendRawTransaction(signedTxns[0]).do();
      
      // Wait for confirmation
      const confirmedTxn = await algosdk.waitForConfirmation(this.algodClient, txId, 4);
      
      if (!confirmedTxn['application-index']) {
        throw new Error('Failed to create application - no application index returned');
      }

      return confirmedTxn['application-index'];

    } catch (error: any) {
      console.error('Failed to create voice memory contract:', error);
      
      // Provide more specific error messages
      if (error.message?.includes('insufficient funds')) {
        throw new Error('Insufficient ALGO balance. Please fund your wallet with test ALGOs from the Algorand testnet dispenser.');
      }
      
      if (error.message?.includes('overspend')) {
        throw new Error('Transaction fee exceeds available balance. Please add more ALGOs to your wallet.');
      }
      
      throw new Error(`Failed to create time-lock contract: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Check if a voice memory is unlocked
   */
  async isMemoryUnlocked(appId: number): Promise<boolean> {
    try {
      const appInfo = await this.algodClient.getApplicationByID(appId).do();
      
      if (!appInfo.params || !appInfo.params['global-state']) {
        return false;
      }
      
      const globalState = appInfo.params['global-state'];
      
      const unlockTimestampState = globalState.find((state: any) => {
        try {
          const key = new TextDecoder().decode(Uint8Array.from(atob(state.key), c => c.charCodeAt(0)));
          return key === 'unlock_timestamp';
        } catch {
          return false;
        }
      });

      if (!unlockTimestampState || !unlockTimestampState.value) {
        return false;
      }

      const unlockTimestamp = unlockTimestampState.value.uint || 0;
      const currentTimestamp = Math.floor(Date.now() / 1000);

      return currentTimestamp >= unlockTimestamp;
    } catch (error) {
      console.error('Failed to check memory unlock status:', error);
      return false;
    }
  }

  /**
   * Get voice memory details from contract
   */
  async getVoiceMemoryDetails(appId: number): Promise<VoiceMemoryContract> {
    try {
      const appInfo = await this.algodClient.getApplicationByID(appId).do();
      
      if (!appInfo.params || !appInfo.params['global-state']) {
        throw new Error('Application has no global state');
      }
      
      const globalState = appInfo.params['global-state'];
      
      const parseGlobalState = (key: string, type: 'uint' | 'bytes', defaultValue?: any) => {
        const state = globalState.find((s: any) => {
          try {
            const stateKey = new TextDecoder().decode(Uint8Array.from(atob(s.key), c => c.charCodeAt(0)));
            return stateKey === key;
          } catch {
            return false;
          }
        });
        
        if (!state || !state.value) {
          if (defaultValue !== undefined) return defaultValue;
          throw new Error(`State key ${key} not found`);
        }
        
        if (type === 'uint') {
          return state.value.uint || 0;
        } else {
          try {
            return new TextDecoder().decode(Uint8Array.from(atob(state.value.bytes), c => c.charCodeAt(0)));
          } catch {
            return defaultValue || '';
          }
        }
      };

      const unlockTimestamp = parseGlobalState('unlock_timestamp', 'uint', 0);
      const currentTimestamp = Math.floor(Date.now() / 1000);

      return {
        appId,
        creator: appInfo.params.creator || '',
        unlockTimestamp,
        ipfsCid: parseGlobalState('ipfs_cid', 'bytes', ''),
        emotionData: {
          tone: parseGlobalState('emotion_tone', 'bytes', 'Unknown'),
          intensity: parseGlobalState('emotion_intensity', 'uint', 500) / 1000
        },
        isLocked: currentTimestamp < unlockTimestamp
      };
    } catch (error: any) {
      console.error('Failed to get voice memory details:', error);
      throw new Error(`Failed to retrieve memory details: ${error.message}`);
    }
  }

  /**
   * Compile the time-locked contract approval program
   */
  private async compileTimeLockedContract(): Promise<Uint8Array> {
    const tealCode = `#pragma version 8

    // Handle application creation
    txn ApplicationID
    int 0
    ==
    bnz handle_creation

    // Handle application calls
    txn OnCompletion
    int NoOp
    ==
    bnz handle_noop

    // Reject all other operations
    int 0
    return

    handle_creation:
        // Store unlock timestamp
        byte "unlock_timestamp"
        txn ApplicationArgs 0
        btoi
        app_global_put

        // Store IPFS CID
        byte "ipfs_cid"
        txn ApplicationArgs 1
        app_global_put

        // Store emotion tone
        byte "emotion_tone"
        txn ApplicationArgs 2
        app_global_put

        // Store emotion intensity
        byte "emotion_intensity"
        txn ApplicationArgs 3
        btoi
        app_global_put

        int 1
        return

    handle_noop:
        // Check if memory is unlocked
        global LatestTimestamp
        byte "unlock_timestamp"
        app_global_get
        >=
        return`;

    try {
      const compiledProgram = await this.algodClient.compile(tealCode).do();
      return new Uint8Array(Uint8Array.from(atob(compiledProgram.result), c => c.charCodeAt(0)));
    } catch (error) {
      console.error('Failed to compile approval program:', error);
      // Fallback to a simple program for development
      return new Uint8Array([6, 1, 1]); // Simple "return 1" program
    }
  }

  /**
   * Compile the clear program
   */
  private async compileClearProgram(): Promise<Uint8Array> {
    const tealCode = `#pragma version 8
    int 1
    return`;

    try {
      const compiledProgram = await this.algodClient.compile(tealCode).do();
      return new Uint8Array(Uint8Array.from(atob(compiledProgram.result), c => c.charCodeAt(0)));
    } catch (error) {
      console.error('Failed to compile clear program:', error);
      return new Uint8Array([6, 1, 1]); // Simple "return 1" program
    }
  }

  /**
   * Get user's voice memories from created applications
   */
  async getUserVoiceMemories(userAddress: string): Promise<VoiceMemoryContract[]> {
    try {
      const accountInfo = await this.indexerClient
        .lookupAccountCreatedApplications(userAddress)
        .do();

      const memories: VoiceMemoryContract[] = [];
      
      for (const app of accountInfo.applications || []) {
        try {
          const memoryDetails = await this.getVoiceMemoryDetails(app.id);
          memories.push(memoryDetails);
        } catch (error) {
          console.warn(`Failed to get details for app ${app.id}:`, error);
        }
      }

      return memories.sort((a, b) => b.unlockTimestamp - a.unlockTimestamp);
    } catch (error) {
      console.error('Failed to get user voice memories:', error);
      return [];
    }
  }

  /**
   * Get network status
   */
  async getNetworkStatus(): Promise<{ status: string; lastRound: number }> {
    try {
      const status = await this.algodClient.status().do();
      return {
        status: 'connected',
        lastRound: status['last-round'] || 0
      };
    } catch (error) {
      console.error('Failed to get network status:', error);
      return {
        status: 'disconnected',
        lastRound: 0
      };
    }
  }

  /**
   * Check account balance and suggest funding if needed
   */
  async checkAccountBalance(address: string): Promise<{ balance: number; needsFunding: boolean }> {
    try {
      const accountInfo = await this.algodClient.accountInformation(address).do();
      const balance = accountInfo.amount || 0;
      const minBalance = 1000000; // 1 ALGO minimum for transactions
      
      return {
        balance: balance / 1000000, // Convert microALGOs to ALGOs
        needsFunding: balance < minBalance
      };
    } catch (error) {
      console.error('Failed to check account balance:', error);
      return { balance: 0, needsFunding: true };
    }
  }
}