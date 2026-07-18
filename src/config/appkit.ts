import { TronAdapter } from '@reown/appkit-adapter-tron'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { bsc, mainnet, tronMainnet } from '@reown/appkit/networks'
import { createAppKit } from '@reown/appkit/react'
import { QueryClient } from '@tanstack/react-query'
import { BitKeepAdapter } from '@tronweb3/tronwallet-adapter-bitkeep'
import { OkxWalletAdapter } from '@tronweb3/tronwallet-adapter-okxwallet'
import { TokenPocketAdapter } from '@tronweb3/tronwallet-adapter-tokenpocket'
import { TronLinkAdapter } from '@tronweb3/tronwallet-adapter-tronlink'

export const projectId = 'cf22c64d7835d0879db47264c842a42d'

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
  url: 'https://tron-wallet-ten.vercel.app',
  icons: ['https://avatars.githubusercontent.com/u/179229932'],
}

// 模块级别初始化，同时挂载 Tron + EVM 双 adapter
export const modal = createAppKit({
  adapters: [tronAdapter, wagmiAdapter],
  networks: [tronMainnet, mainnet, bsc],
  defaultNetwork: mainnet,  // EVM 为默认，Tron 页面会通过 switchNetwork 切换
  projectId,
  metadata,
  features: {
    analytics: false,
    email: false,
    socials: [],
    swaps: false,
    onramp: false,
  },
})
