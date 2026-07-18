import './WalletGuide.css'

interface WalletInfo {
  name: string
  icon: string
  deepLink: string
  storeUrl: { ios: string; android: string }
}

const WALLETS: WalletInfo[] = [
  {
    name: 'TronLink',
    icon: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=TronLink%20crypto%20wallet%20app%20icon%20red%20gradient%20clean%20minimal&image_size=square_hd',
    deepLink: 'tronlinkoutside://pull.activity?param=',
    storeUrl: {
      ios: 'https://apps.apple.com/app/tronlink/id1453530188',
      android: 'https://play.google.com/store/apps/details?id=com.tronlinkpro.wallet',
    },
  },
  {
    name: 'OKX Wallet',
    icon: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=OKX%20crypto%20exchange%20wallet%20app%20icon%20black%20minimal%20clean&image_size=square_hd',
    deepLink: 'okx://wallet/dapp/url?dappUrl=',
    storeUrl: {
      ios: 'https://apps.apple.com/app/okx/id1327268470',
      android: 'https://play.google.com/store/apps/details?id=com.okinc.okex.gp',
    },
  },
  {
    name: 'Bitget Wallet',
    icon: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Bitget%20crypto%20wallet%20app%20icon%20blue%20gradient%20minimal%20clean&image_size=square_hd',
    deepLink: 'bitkeep://dapp?url=',
    storeUrl: {
      ios: 'https://apps.apple.com/app/bitget-wallet/id1395301115',
      android: 'https://play.google.com/store/apps/details?id=com.bitkeep.wallet',
    },
  },
  {
    name: 'TokenPocket',
    icon: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=TokenPocket%20crypto%20wallet%20app%20icon%20blue%20circle%20minimal&image_size=square_hd',
    deepLink: 'tpoutside://pull.activity?param=',
    storeUrl: {
      ios: 'https://apps.apple.com/app/tp-global-wallet/id1436028697',
      android: 'https://play.google.com/store/apps/details?id=vip.mytokenpocket',
    },
  },
]

function getStoreLink(wallet: WalletInfo): string {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) return wallet.storeUrl.ios
  return wallet.storeUrl.android
}

function openInWallet(wallet: WalletInfo): void {
  const currentUrl = encodeURIComponent(window.location.href)
  const deepLink = wallet.deepLink + currentUrl

  // 尝试 DeepLink 跳转，失败则跳商店
  window.location.href = deepLink

  // 延迟检测是否跳转成功，若未成功则引导去下载
  setTimeout(() => {
    if (!document.hidden) {
      window.open(getStoreLink(wallet), '_blank')
    }
  }, 2000)
}

export default function WalletGuide() {
  return (
    <div className="guide-container">
      <div className="guide-header">
        <div className="guide-icon">🔗</div>
        <h2>选择钱包</h2>
        <p>请在钱包 App 内置浏览器中打开以完成转账</p>
      </div>
      <ul className="wallet-list">
        {WALLETS.map((wallet) => (
          <li key={wallet.name} className="wallet-item" onClick={() => openInWallet(wallet)}>
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
