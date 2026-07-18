import './PayPage.css'

import { useEffect, useState } from 'react'

import { useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'

import { callAppBridge } from '../utils/jsbridge'
import { isEvm, isTronUSDT, parsePayParams, USDT_TRC20 } from '../utils/params'
import EvmTransfer from './EvmTransfer'
import WalletGuide from './WalletGuide'

import type { PayParams } from '../utils/params'
import type { TronConnector } from '@reown/appkit-adapter-tron'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TronWebAny = any

type Step = 'connect' | 'confirm' | 'sending' | 'done' | 'error'

// 编码 TRC20 transfer(address,uint256) 的 ABI data
function encodeTrc20Transfer(toAddress: string, amountHex: string): string {
  const tronWeb = window.tronWeb as TronWebAny
  const addrHex = tronWeb.address.toHex(toAddress).slice(2).padStart(64, '0')
  const amountPadded = amountHex.replace('0x', '').padStart(64, '0')
  return '0xa9059cbb' + addrHex + amountPadded
}

// ── Tron 转账页面 ─────────────────────────────────────────────
function TronTransfer({ payParams }: { payParams: PayParams }) {
  const [step, setStep] = useState<Step>('connect')
  const [txHash, setTxHash] = useState('')
  const [errMsg, setErrMsg] = useState('')
  const [walletInjected, setWalletInjected] = useState(false)

  const { address, isConnected } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider<TronConnector>('tron')
  const { open } = useAppKit()

  useEffect(() => {
    const check = () => setWalletInjected(!!window.tronWeb)
    check()
    const timer = setTimeout(check, 1500)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (isConnected && step === 'connect') setStep('confirm')
  }, [isConnected, step])

  async function handleTransfer() {
    if (!payParams || !address || !walletProvider) return
    setStep('sending')
    setErrMsg('')
    try {
      let hash = ''
      if (isTronUSDT(payParams.currency)) {
        const amountInt = BigInt(Math.round(parseFloat(payParams.amount) * 1_000_000))
        const amountHex = amountInt.toString(16)
        const data = encodeTrc20Transfer(payParams.toAddress, amountHex)
        hash = await walletProvider.sendTransaction({
          from: address, to: USDT_TRC20, value: '0', data,
        })
      } else {
        const amountSun = Math.round(parseFloat(payParams.amount) * 1_000_000).toString()
        hash = await walletProvider.sendTransaction({
          from: address, to: payParams.toAddress, value: amountSun,
        })
      }
      setTxHash(hash)
      setStep('done')
      callAppBridge({ hash, status: 'success' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      if (/reject|cancel|denied|user/i.test(message)) { setStep('confirm'); return }
      let friendlyMsg = message
      if (/failed to create transaction/i.test(message)) friendlyMsg = '交易创建失败：账户 TRX 余额或 Energy 不足，USDT 转账约需 13-15 TRX 手续费'
      else if (/insufficient balance/i.test(message)) friendlyMsg = '余额不足，请检查账户 TRX / USDT 余额'
      else if (/account not exist/i.test(message)) friendlyMsg = '收款地址不存在，首次收款需要激活账户（约 1 TRX）'
      else if (/bandwidth/i.test(message)) friendlyMsg = 'Bandwidth 不足，请确保账户有足够 TRX'
      setErrMsg(friendlyMsg)
      setStep('error')
      callAppBridge({ hash: '', status: 'failed', error: friendlyMsg })
    }
  }

  // 未检测到注入，显示 Tron 钱包引导
  if (!walletInjected && !isConnected) {
    return <WalletGuide network="tron" />
  }

  return (
    <div>
      {step === 'connect' && (
        <div className="pay-step">
          <p className="pay-step-desc">请先连接钱包</p>
          <button className="pay-btn" onClick={() => open()}>连接钱包</button>
        </div>
      )}
      {step === 'confirm' && (
        <div className="pay-step">
          <div className="pay-connected-info">
            <span className="pay-dot" />
            <span>已连接: {address?.slice(0, 6)}...{address?.slice(-4)}</span>
          </div>
          <button className="pay-btn" onClick={handleTransfer}>确认转账</button>
          <button className="pay-btn-outline" onClick={() => open()}>切换钱包</button>
        </div>
      )}
      {step === 'sending' && (
        <div className="pay-step pay-center">
          <div className="pay-spinner" />
          <p>请在钱包弹窗中确认交易...</p>
          <p className="pay-sending-sub">确认后等待链上广播完成</p>
        </div>
      )}
      {step === 'done' && (
        <div className="pay-step pay-center">
          <div className="pay-status-icon">✅</div>
          <h3>转账成功</h3>
          <p className="pay-hash-label">交易哈希</p>
          <p className="pay-hash">{txHash}</p>
          <a className="pay-link" href={`https://tronscan.org/#/transaction/${txHash}`} target="_blank" rel="noreferrer">
            在 TronScan 查看
          </a>
        </div>
      )}
      {step === 'error' && (
        <div className="pay-step pay-center">
          <div className="pay-status-icon">❌</div>
          <h3>转账失败</h3>
          <p className="pay-error-msg">{errMsg}</p>
          <button className="pay-btn" onClick={() => setStep('confirm')}>重试</button>
        </div>
      )}
    </div>
  )
}

// ── 主页面：根据 network 分发 ─────────────────────────────────
export default function PayPage() {
  const [payParams, setPayParams] = useState<PayParams | null>(null)

  useEffect(() => {
    setPayParams(parsePayParams())
  }, [])

  if (!payParams) {
    return (
      <div className="pay-container">
        <div className="pay-error-box">
          <div className="pay-status-icon">⚠️</div>
          <h3>参数错误</h3>
          <p>缺少必要参数，请通过 App 正确打开此页面</p>
          <p className="pay-hint">需要: currency / toAddress / amount / network</p>
        </div>
      </div>
    )
  }

  const networkLabel: Record<string, string> = {
    tron: 'TRON', eth: 'Ethereum', bsc: 'BNB Chain',
  }

  return (
    <div className="pay-container">
      {/* 充值信息卡片 */}
      <div className="pay-card">
        <div className="pay-card-label">充值信息</div>
        <div className="pay-amount-row">
          <span className="pay-amount">{payParams.amount}</span>
          <span className="pay-currency">{payParams.currency}</span>
        </div>
        <div className="pay-info-row">
          <span className="pay-info-label">收款地址</span>
          <span className="pay-info-value">{payParams.toAddress}</span>
        </div>
        <div className="pay-info-row">
          <span className="pay-info-label">网络</span>
          <span className="pay-info-value">{networkLabel[payParams.network] ?? payParams.network.toUpperCase()}</span>
        </div>
      </div>

      {/* 根据网络分发转账流程 */}
      {isEvm(payParams.network)
        ? <EvmTransfer payParams={payParams} />
        : <TronTransfer payParams={payParams} />
      }

      <p className="pay-footer-tip">
        Powered by Reown AppKit · {networkLabel[payParams.network] ?? payParams.network.toUpperCase()}
      </p>
    </div>
  )
}
