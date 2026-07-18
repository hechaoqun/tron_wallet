import { useEffect, useState } from 'react'
import { useAppKitAccount, useAppKit, useAppKitProvider } from '@reown/appkit/react'
import type { TronConnector } from '@reown/appkit-adapter-tron'
import { callAppBridge } from '../utils/jsbridge'
import { parsePayParams, isUSDT, USDT_CONTRACT, type PayParams } from '../utils/params'
import WalletGuide from './WalletGuide'
import './PayPage.css'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TronWebAny = any

type Step = 'connect' | 'confirm' | 'sending' | 'done' | 'error'

// 编码 TRC20 transfer(address,uint256) 的 ABI data
// 函数选择器: a9059cbb
function encodeTrc20Transfer(toAddress: string, amountHex: string): string {
  // TronWeb 地址转 hex（去掉 41 前缀后补齐 32 字节）
  const tronWeb = window.tronWeb as TronWebAny
  // 将 Base58 地址转为 hex，去掉前两位 "41"，左补齐 64 位
  const addrHex = tronWeb.address.toHex(toAddress).slice(2).padStart(64, '0')
  // 金额补齐 64 位 hex
  const amountPadded = amountHex.replace('0x', '').padStart(64, '0')
  return '0xa9059cbb' + addrHex + amountPadded
}

export default function PayPage() {
  const [payParams, setPayParams] = useState<PayParams | null>(null)
  const [step, setStep] = useState<Step>('connect')
  const [txHash, setTxHash] = useState('')
  const [errMsg, setErrMsg] = useState('')
  const [walletInjected, setWalletInjected] = useState(false)

  const { address, isConnected } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider<TronConnector>('tron')
  const { open } = useAppKit()

  // 解析 URL 参数
  useEffect(() => {
    const params = parsePayParams()
    setPayParams(params)
  }, [])

  // 检测是否在钱包内置浏览器（有 tronWeb 注入）
  useEffect(() => {
    const check = () => setWalletInjected(!!window.tronWeb)
    check()
    // 有些钱包注入较慢，轮询一次
    const timer = setTimeout(check, 1500)
    return () => clearTimeout(timer)
  }, [])

  // 已连接时推进到确认步骤
  useEffect(() => {
    if (isConnected && step === 'connect') {
      setStep('confirm')
    }
  }, [isConnected, step])

  // 发起转账
  async function handleTransfer() {
    if (!payParams || !address || !walletProvider) return
    setStep('sending')
    setErrMsg('')

    try {
      let hash = ''

      if (isUSDT(payParams.currency)) {
        // USDT TRC20 转账
        // 通过 data 字段传入编码的 transfer(address,uint256) 调用
        const amountInt = BigInt(Math.round(parseFloat(payParams.amount) * 1_000_000))
        const amountHex = amountInt.toString(16)
        const data = encodeTrc20Transfer(payParams.toAddress, amountHex)

        hash = await walletProvider.sendTransaction({
          from: address,
          to: USDT_CONTRACT,   // 发给合约地址
          value: '0',          // TRC20 不转 TRX，value 为 0
          data,                // 编码的合约调用数据
        })
      } else {
        // TRX 原生转账，value 单位是 Sun（1 TRX = 1,000,000 Sun）
        const amountSun = Math.round(parseFloat(payParams.amount) * 1_000_000).toString()

        hash = await walletProvider.sendTransaction({
          from: address,
          to: payParams.toAddress,
          value: amountSun,
        })
      }

      setTxHash(hash)
      setStep('done')
      callAppBridge({ hash, status: 'success' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      // 用户主动拒绝/取消，回到确认页不报错
      if (/reject|cancel|denied|user/i.test(message)) {
        setStep('confirm')
        return
      }
      setErrMsg(message)
      setStep('error')
      callAppBridge({ hash: '', status: 'failed', error: message })
    }
  }

  // 参数缺失
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

  // 未检测到钱包注入，显示引导页
  if (!walletInjected && !isConnected) {
    return (
      <div className="pay-container">
        <WalletGuide />
      </div>
    )
  }

  return (
    <div className="pay-container">
      {/* 顶部信息卡片 */}
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
          <span className="pay-info-value">{payParams.network.toUpperCase()}</span>
        </div>
      </div>

      {/* 步骤内容 */}
      {step === 'connect' && (
        <div className="pay-step">
          <p className="pay-step-desc">请先连接钱包</p>
          <button className="pay-btn" onClick={() => open()}>
            连接钱包
          </button>
        </div>
      )}

      {step === 'confirm' && (
        <div className="pay-step">
          <div className="pay-connected-info">
            <span className="pay-dot" />
            <span>
              已连接: {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
          </div>
          <button className="pay-btn" onClick={handleTransfer}>
            确认转账
          </button>
          <button className="pay-btn-outline" onClick={() => open()}>
            切换钱包
          </button>
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
          <a
            className="pay-link"
            href={`https://tronscan.org/#/transaction/${txHash}`}
            target="_blank"
            rel="noreferrer"
          >
            在 TronScan 查看
          </a>
        </div>
      )}

      {step === 'error' && (
        <div className="pay-step pay-center">
          <div className="pay-status-icon">❌</div>
          <h3>转账失败</h3>
          <p className="pay-error-msg">{errMsg}</p>
          <button className="pay-btn" onClick={() => setStep('confirm')}>
            重试
          </button>
        </div>
      )}

      {/* 底部提示 */}
      <p className="pay-footer-tip">Powered by Reown AppKit · TRON Network</p>
    </div>
  )
}
