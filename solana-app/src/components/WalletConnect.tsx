import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useEffect, useState } from 'react';

export const WalletConnect = () => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    const fetchBalance = async () => {
      if (publicKey) {
        try {
          const lamports = await connection.getBalance(publicKey);
          setBalance(lamports / 1e9); // lamports → SOL
        } catch (err) {
          console.error('Error fetching balance:', err);
          setBalance(null);
        }
      } else {
        setBalance(null);
      }
    };

    fetchBalance();
  }, [publicKey, connection]);

  return (
    <div className="bg-gray-800 p-6 rounded-xl shadow-md h-fit">
      <h2 className="text-2xl font-bold mb-4 text-center">Wallet Connection</h2>
      
      <div className="flex flex-col items-center space-y-4">
        <WalletMultiButton className="!bg-indigo-600 hover:!bg-indigo-700 text-white" />
        
        {publicKey && (
          <div className="w-full p-4 bg-gray-700 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-2">Connected Wallet</p>
              <p className="text-sm text-gray-300 font-mono break-all mb-3">
                {publicKey.toBase58()}
              </p>
              <div className="flex justify-center items-center space-x-2">
                <span className="text-2xl font-bold text-green-400">
                  {balance !== null ? `${balance.toFixed(4)}` : '...'}
                </span>
                <span className="text-gray-400">SOL</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};