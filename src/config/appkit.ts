import { createAppKit } from '@reown/appkit/react'
import { TronAdapter } from '@reown/appkit-adapter-tron'
import { tronMainnet } from '@reown/appkit/networks'
import { TronLinkAdapter } from '@tronweb3/tronwallet-adapter-tronlink'
import { OkxWalletAdapter } from '@tronweb3/tronwallet-adapter-okxwallet'
import { BitKeepAdapter } from '@tronweb3/tronwallet-adapter-bitkeep'
import { TokenPocketAdapter } from '@tronweb3/tronwallet-adapter-tokenpocket'

export const projectId = '9402fd8ff9258d576cfd821f722d16b0'

export const networks = [tronMainnet]

// 配置 4 款钱包适配器
const tronAdapter = new TronAdapter({
  walletAdapters: [
    new TronLinkAdapter({
      openUrlWhenWalletNotFound: false,
      checkTimeout: 3000,
    }),
    new OkxWalletAdapter({
      openUrlWhenWalletNotFound: false,
    }),
    new BitKeepAdapter({
      openUrlWhenWalletNotFound: false,
    }),
    new TokenPocketAdapter({
      openUrlWhenWalletNotFound: false,
    }),
  ],
})

const metadata = {
  name: 'Crypto Recharge',
  description: 'TRON 网络充值转账',
  url: 'http://localhost:5173',
  icons: ['https://avatars.githubusercontent.com/u/179229932'],
}

// 在模块级别初始化 AppKit（不能在组件内调用）
export const modal = createAppKit({
  adapters: [tronAdapter],
  networks: [tronMainnet],
  projectId,
  metadata,
  features: {
    analytics: false,
    email: false,
    socials: [],
  },
})
