import './WalletGuide.css'

type WalletId =
  | 'tronlink' | 'okx' | 'bitget' | 'tokenpocket'
  | 'metamask' | 'trust' | 'coinbase' | 'imtoken' | 'rabby' | 'rainbow'

interface WalletInfo {
  id: WalletId
  name: string
  icon: string
  chains: ('tron' | 'evm')[]
  storeUrl: { ios: string; android: string }
}

const WALLETS: WalletInfo[] = [
  {
    id: 'tronlink',
    name: 'TronLink',
    icon: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=TronLink%20crypto%20wallet%20app%20icon%20red%20gradient%20clean%20minimal&image_size=square_hd',
    chains: ['tron'],
    storeUrl: {
      ios: 'https://apps.apple.com/app/tronlink/id1453530188',
      android: 'https://play.google.com/store/apps/details?id=com.tronlinkpro.wallet',
    },
  },
  {
    id: 'metamask',
    name: 'MetaMask',
    icon: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=MetaMask%20crypto%20wallet%20fox%20icon%20orange%20minimal%20clean&image_size=square_hd',
    chains: ['evm'],
    storeUrl: {
      ios: 'https://apps.apple.com/app/metamask/id1438144202',
      android: 'https://play.google.com/store/apps/details?id=io.metamask',
    },
  },
  {
    id: 'okx',
    name: 'OKX Wallet',
    icon: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=OKX%20crypto%20exchange%20wallet%20app%20icon%20black%20minimal%20clean&image_size=square_hd',
    chains: ['tron', 'evm'],
    storeUrl: {
      ios: 'https://apps.apple.com/app/okx/id1327268470',
      android: 'https://play.google.com/store/apps/details?id=com.okinc.okex.gp',
    },
  },
  {
    id: 'trust',
    name: 'Trust Wallet',
    icon: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Trust%20Wallet%20crypto%20shield%20icon%20blue%20minimal%20clean&image_size=square_hd',
    chains: ['evm'],
    storeUrl: {
      ios: 'https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409',
      android: 'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp',
    },
  },
  {
    id: 'bitget',
    name: 'Bitget Wallet',
    icon: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Bitget%20crypto%20wallet%20app%20icon%20blue%20gradient%20minimal%20clean&image_size=square_hd',
    chains: ['tron', 'evm'],
    storeUrl: {
      ios: 'https://apps.apple.com/app/bitget-wallet/id1395301115',
      android: 'https://play.google.com/store/apps/details?id=com.bitkeep.wallet',
    },
  },
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    icon: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Coinbase%20crypto%20wallet%20blue%20circle%20icon%20minimal%20clean&image_size=square_hd',
    chains: ['evm'],
    storeUrl: {
      ios: 'https://apps.apple.com/app/coinbase-wallet/id1278383455',
      android: 'https://play.google.com/store/apps/details?id=org.toshi',
    },
  },
  {
    id: 'tokenpocket',
    name: 'TokenPocket',
    icon: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=TokenPocket%20crypto%20wallet%20app%20icon%20blue%20circle%20minimal&image_size=square_hd',
    chains: ['tron', 'evm'],
    storeUrl: {
      ios: 'https://apps.apple.com/app/tp-global-wallet/id1436028697',
      android: 'https://play.google.com/store/apps/details?id=vip.mytokenpocket',
    },
  },
  {
    id: 'imtoken',
    name: 'imToken',
    icon: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=imToken%20crypto%20wallet%20blue%20diamond%20icon%20minimal%20clean&image_size=square_hd',
    chains: ['evm'],
    storeUrl: {
      ios: 'https://apps.apple.com/app/imtoken-btc-eth-wallet/id1384798940',
      android: 'https://play.google.com/store/apps/details?id=im.token.app',
    },
  },
  {
    id: 'rabby',
    name: 'Rabby',
    icon: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Rabby%20wallet%20purple%20duck%20icon%20minimal%20clean%20crypto&image_size=square_hd',
    chains: ['evm'],
    storeUrl: {
      ios: 'https://apps.apple.com/app/rabby-wallet/id6474381673',
      android: 'https://play.google.com/store/apps/details?id=com.debank.rabbymobile',
    },
  },
  {
    id: 'rainbow',
    name: 'Rainbow',
    icon: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Rainbow%20wallet%20colorful%20arc%20icon%20minimal%20clean%20crypto&image_size=square_hd',
    chains: ['evm'],
    storeUrl: {
      ios: 'https://apps.apple.com/app/rainbow-ethereum-wallet/id1457119021',
      android: 'https://play.google.com/store/apps/details?id=me.rainbow',
    },
  },
]

function getStoreLink(wallet: WalletInfo): string {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) return wallet.storeUrl.ios
  return wallet.storeUrl.android
}

function buildDeepLink(wallet: WalletInfo): string {
  const dappUrl = window.location.href

  switch (wallet.id) {
    case 'tronlink': {
      const payload = JSON.stringify({ url: dappUrl, action: 'open', protocol: 'TronLink', version: '1.0' })
      return `tronlinkoutside://pull.activity?param=${encodeURIComponent(payload)}`
    }
    case 'metamask':
      return `metamask://dapp/${encodeURIComponent(dappUrl.replace(/^https?:\/\//, ''))}`
    case 'okx':
      return `okx://wallet/dapp/url?dappUrl=${encodeURIComponent(dappUrl)}`
    case 'trust':
      return `trust://browser_enable?url=${encodeURIComponent(dappUrl)}`
    case 'bitget':
      return `bitkeep://dapp?url=${encodeURIComponent(dappUrl)}`
    case 'coinbase':
      return `cbwallet://dapp?url=${encodeURIComponent(dappUrl)}`
    case 'tokenpocket': {
      const payload = JSON.stringify({ url: dappUrl, action: 'open', protocol: 'TRON', version: '1.0' })
      return `tpoutside://pull.activity?param=${encodeURIComponent(payload)}`
    }
    case 'imtoken':
      return `imtokenv2://navigate/DappView?url=${encodeURIComponent(dappUrl)}`
    case 'rabby':
      return `rabby://dapp?url=${encodeURIComponent(dappUrl)}`
    case 'rainbow':
      return `rainbow://dapp?url=${encodeURIComponent(dappUrl)}`
    default:
      return ''
  }
}

function openInWallet(wallet: WalletInfo): void {
  const deepLink = buildDeepLink(wallet)
  if (!deepLink) return
  window.location.href = deepLink
  setTimeout(() => {
    if (!document.hidden) window.open(getStoreLink(wallet), '_blank')
  }, 2000)
}

interface Props {
  network?: 'tron' | 'evm' | string
}

export default function WalletGuide({ network = 'tron' }: Props) {
  const chainType = network === 'tron' ? 'tron' : 'evm'
  const wallets = WALLETS.filter(w => w.chains.includes(chainType))
  const title = chainType === 'tron' ? 'TRON 钱包' : 'EVM 钱包'

  return (
    <div className="guide-container">
      <div className="guide-header">
        <div className="guide-icon">🔗</div>
        <h2>选择{title}</h2>
        <p>请在钱包 App 内置浏览器中打开以完成转账</p>
      </div>
      <ul className="wallet-list">
        {wallets.map((wallet) => (
          <li key={wallet.id} className="wallet-item" onClick={() => openInWallet(wallet)}>
            <img src={wallet.icon} alt={wallet.name} className="wallet-icon" />
            <span className="wallet-name">{wallet.name}</span>
            <span className="wallet-arrow">›</span>
          </li>
        ))}
      </ul>
      <p className="guide-tip">点击上方钱包，将在对应 App 内打开本页面</p>
    </div>
  )
}
