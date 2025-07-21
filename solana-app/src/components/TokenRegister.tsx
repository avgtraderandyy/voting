import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect } from 'react';
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getMint, getAccount } from '@solana/spl-token';

interface TokenInfo {
  mint: string;
  name: string;
  symbol: string;
  decimals: number;
  supply: string;
  balance: string;
}

const REGISTRATION_FEE = 0.1; // SOL
const FEE_RECIPIENT = 'H2C9Vy83i96YyKyu7JuGLaPS7MkL2wSgcrpR52CTYTHJ';

export const TokenRegister = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [selectedToken, setSelectedToken] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showTokens, setShowTokens] = useState(false);
  const [showFeeConfirmation, setShowFeeConfirmation] = useState(false);
  const [feeAccepted, setFeeAccepted] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const fetchUserTokens = async () => {
    if (!publicKey) return;

    setLoading(true);
    try {
      // Get all token accounts owned by the user
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        { programId: TOKEN_PROGRAM_ID }
      );

      const userTokens: TokenInfo[] = [];

      for (const tokenAccount of tokenAccounts.value) {
        const accountData = tokenAccount.account.data.parsed.info;
        const mintAddress = new PublicKey(accountData.mint);

        try {
          // Get mint info to check if user is the mint authority
          const mintInfo = await getMint(connection, mintAddress);
          
          // Only include tokens where the user is the mint authority
          if (mintInfo.mintAuthority && mintInfo.mintAuthority.equals(publicKey)) {
            const tokenInfo: TokenInfo = {
              mint: mintAddress.toBase58(),
              name: `Token ${mintAddress.toBase58().slice(0, 6)}...`,
              symbol: `TKN${mintAddress.toBase58().slice(-3)}`,
              decimals: mintInfo.decimals,
              supply: (Number(mintInfo.supply) / Math.pow(10, mintInfo.decimals)).toFixed(2),
              balance: (Number(accountData.tokenAmount.amount) / Math.pow(10, mintInfo.decimals)).toFixed(2)
            };
            userTokens.push(tokenInfo);
          }
        } catch (error) {
          console.error(`Error processing token ${mintAddress.toBase58()}:`, error);
        }
      }

      setTokens(userTokens);
    } catch (error) {
      console.error('Error fetching user tokens:', error);
    }
    setLoading(false);
  };

  const handleRegisterToken = () => {
    if (!publicKey) {
      alert('Please connect your wallet first');
      return;
    }
    
    setShowTokens(true);
    fetchUserTokens();
  };

  const handleTokenSelect = (tokenMint: string) => {
    setSelectedToken(tokenMint);
    setShowFeeConfirmation(true);
    setFeeAccepted(false);
    console.log('Selected token for registration:', tokenMint);
  };

  const handlePayAndRegister = async () => {
    if (!publicKey || !selectedToken || !feeAccepted) {
      alert('Please accept the fee terms first');
      return;
    }

    setIsRegistering(true);
    
    try {
      // Create transaction to transfer registration fee
      const feeRecipient = new PublicKey(FEE_RECIPIENT);
      const lamports = REGISTRATION_FEE * LAMPORTS_PER_SOL;
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: feeRecipient,
          lamports: lamports,
        })
      );

      // Get latest blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Send transaction
      const signature = await sendTransaction(transaction, connection);
      
      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error('Transaction failed');
      }

      // Registration successful
      alert(`🎉 Token registration successful!\n\nTransaction: ${signature}\nToken: ${selectedToken.slice(0, 8)}...`);
      
      // Reset states
      setSelectedToken('');
      setShowFeeConfirmation(false);
      setFeeAccepted(false);
      
    } catch (error: any) {
      console.error('Registration failed:', error);
      alert(`Registration failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleCancelRegistration = () => {
    setSelectedToken('');
    setShowFeeConfirmation(false);
    setFeeAccepted(false);
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-center">Token Registration</h2>
      
      {!publicKey ? (
        <div className="text-center py-8">
          <p className="text-gray-400 mb-4">Connect your wallet to register tokens</p>
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center">
            <span className="text-2xl">🔒</span>
          </div>
        </div>
      ) : !showTokens ? (
        <div className="text-center py-6">
          <p className="text-gray-400 mb-6">
            Register tokens that you've created to make them discoverable
          </p>
          <button
            onClick={handleRegisterToken}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            🎯 Register Your Token
          </button>
        </div>
      ) : showFeeConfirmation ? (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-2">Registration Fee Required</h3>
            <p className="text-gray-400">Complete your token registration</p>
          </div>

          {/* Selected Token Info */}
          <div className="bg-gray-700 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Selected Token:</h4>
            {tokens.find(t => t.mint === selectedToken) && (
              <div className="text-sm">
                <p className="text-gray-300">{tokens.find(t => t.mint === selectedToken)?.name}</p>
                <p className="text-gray-400 font-mono text-xs">{selectedToken}</p>
              </div>
            )}
          </div>

          {/* Fee Information */}
          <div className="bg-yellow-900/20 border border-yellow-600 p-4 rounded-lg">
            <div className="flex items-start space-x-3">
              <span className="text-yellow-400 text-xl">💰</span>
              <div>
                <h4 className="font-semibold text-yellow-400 mb-2">Registration Fee</h4>
                <p className="text-sm text-gray-300 mb-3">
                  A registration fee of <span className="font-bold text-yellow-400">{REGISTRATION_FEE} SOL</span> is required to complete token registration.
                </p>
                <p className="text-xs text-gray-400">
                  This fee helps maintain the token registry and prevent spam registrations.
                </p>
              </div>
            </div>
          </div>

          {/* Fee Acceptance Checkbox */}
          <div className="bg-gray-700 p-4 rounded-lg">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={feeAccepted}
                onChange={(e) => setFeeAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 text-green-600 bg-gray-600 border-gray-500 rounded focus:ring-green-500"
              />
              <div className="text-sm">
                <p className="text-gray-300">
                  I understand and agree to pay the registration fee of <span className="font-bold text-yellow-400">{REGISTRATION_FEE} SOL</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  This payment will be sent to: <span className="font-mono">{FEE_RECIPIENT}</span>
                </p>
              </div>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handlePayAndRegister}
              disabled={!feeAccepted || isRegistering}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                feeAccepted && !isRegistering
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isRegistering ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                `💳 Pay ${REGISTRATION_FEE} SOL & Register`
              )}
            </button>
            
            <button
              onClick={handleCancelRegistration}
              disabled={isRegistering}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>

          <div className="text-center">
            <button
              onClick={() => setShowFeeConfirmation(false)}
              disabled={isRegistering}
              className="text-gray-400 hover:text-white text-sm transition-colors disabled:opacity-50"
            >
              ← Back to Token Selection
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Your Created Tokens</h3>
            <button
              onClick={() => fetchUserTokens()}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm py-1 px-3 rounded transition-colors"
            >
              {loading ? '🔄' : '↻'} {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                <p className="text-gray-400">Loading your tokens...</p>
              </div>
            ) : tokens.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-gray-400 mb-2">No tokens found</p>
                <p className="text-sm text-gray-500">
                  Only tokens where you are the mint authority will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {tokens.map((token) => (
                  <div
                    key={token.mint}
                    className="border rounded-lg p-4 cursor-pointer transition-all border-gray-600 hover:border-gray-500 hover:bg-gray-700/30"
                    onClick={() => handleTokenSelect(token.mint)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-semibold text-lg">{token.name}</h4>
                          <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
                            {token.symbol}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 font-mono mt-1 break-all">
                          {token.mint}
                        </p>
                      </div>
                      <div className="text-right ml-4 text-sm">
                        <p className="text-gray-400">Supply: <span className="text-white font-mono">{token.supply}</span></p>
                        <p className="text-gray-400">Balance: <span className="text-green-400 font-mono">{token.balance}</span></p>
                        <p className="text-gray-500">Dec: {token.decimals}</p>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-gray-600">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Click to register this token</span>
                        <span className="text-yellow-400 text-sm font-semibold">{REGISTRATION_FEE} SOL fee</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-700">
            <button
              onClick={() => setShowTokens(false)}
              className="text-gray-400 hover:text-white text-sm transition-colors flex items-center space-x-1"
            >
              <span>←</span>
              <span>Back to Registration</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
