import { useState, useEffect } from 'react';
import { Wallet, LogOut } from 'lucide-react';

interface WalletConnectProps {
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
}

export function WalletConnect({ onConnect, onDisconnect }: WalletConnectProps) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const savedAddress = localStorage.getItem('walletAddress');
    if (savedAddress) {
      setWalletAddress(savedAddress);
      onConnect?.(savedAddress);
    }
  }, []);

  const connectWallet = async () => {
    if (typeof window.solana === 'undefined') {
      alert('Please install Phantom wallet to continue');
      window.open('https://phantom.app/', '_blank');
      return;
    }

    setIsConnecting(true);
    try {
      const response = await window.solana.connect();
      const address = response.publicKey.toString();

      setWalletAddress(address);
      localStorage.setItem('walletAddress', address);
      onConnect?.(address);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    localStorage.removeItem('walletAddress');
    onDisconnect?.();
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (walletAddress) {
    return (
      <div className="flex items-center gap-3 bg-slate-100 rounded-xl px-4 py-2.5 border-2 border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-slate-700">
            {formatAddress(walletAddress)}
          </span>
        </div>
        <button
          onClick={disconnectWallet}
          className="text-slate-500 hover:text-red-600 transition-colors p-1"
          title="Disconnect wallet"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={connectWallet}
        disabled={true}
        className="flex items-center gap-2 bg-gradient-to-r from-slate-400 to-slate-500 text-white font-medium px-5 py-2.5 rounded-xl transition-all opacity-60 cursor-not-allowed shadow-md"
      >
        <Wallet className="w-5 h-5" />
        <span>Connect Wallet</span>
      </button>
      <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-semibold px-2 py-1 rounded-md shadow-lg">
        Coming Soon
      </div>
    </div>
  );
}
