import { createAppKit } from '@reown/appkit/react'
import { TronAdapter } from '@reown/appkit-adapter-tron'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { tronMainnet, mainnet, bsc } from '@reown/appkit/networks'
import { TronLinkAdapter } from '@tronweb3/tronwallet-adapter-tronlink'
import { OkxWalletAdapter } from '@tronweb3/tronwallet-adapter-okxwallet'
import { BitKeepAdapter } from '@tronweb3/tronwallet-adapter-bitkeep'
import { TokenPocketAdapter } from '@tronweb3/tronwallet-adapter-tokenpocket'
import { QueryClient } from '@tanstack/react-query'

export const projectId = '9402fd8ff9258d576cfd821f722d16b0'

export const queryClient = new QueryClient()

// EVM 网络：Ethereum + BNB Chain
export const evmNetworks = [mainnet, bsc]

// Tron 适配器（4 款钱包）
const tronAdapter = new TronAdapter({
  walletAdapters: [
    new TronLinkAdapter({ openUrlWhenWalletNotFound: false, checkTimeout: 3000 }),
    new OkxWalletAdapter({ openUrlWhenWalletNotFound: false }),
    new BitKeepAdapter({ openUrlWhenWalletNotFound: false }),
    new TokenPocketAdapter({ openUrlWhenWalletNotFound: false }),
  ],
})

// EVM 适配器（支持所有 EIP-6963 钱包：MetaMask/OKX/Trust/Bitget 等）
export const wagmiAdapter = new WagmiAdapter({
  networks: evmNetworks,
  projectId,
})

const metadata = {
  name: 'Crypto Recharge',
  description: '加密货币充值转账',
  url: 'http://localhost:5173',
  icons: ['https://avatars.githubusercontent.com/u/179229932'],
}

// 模块级别初始化，同时挂载 Tron + EVM 双 adapter
export const modal = createAppKit({
  adapters: [tronAdapter, wagmiAdapter],
  networks: [tronMainnet, mainnet, bsc],
  projectId,
  metadata,
  features: {
    analytics: false,
    email: false,
    socials: [],
  },
})
