import { useEffect, useState } from 'react'
import { useAppKitAccount, useAppKitProvider, useAppKit } from '@reown/appkit/react'
import { callAppBridge } from '../utils/jsbridge'
import { parsePayParams, isUSDT, USDT_CONTRACT, type PayParams } from '../utils/params'
import WalletGuide from './WalletGuide'
import './PayPage.css'

// TronWeb 类型声明（由钱包注入）
declare global {
  interface Window {
    tronWeb?: {
      defaultAddress?: { base58?: string }
      transactionBuilder: {
        triggerSmartContract: (
          contractAddress: string,
          functionSelector: string,
          options: object,
          parameters: { type: string; value: unknown }[],
          issuerAddress: string
        ) => Promise<{ transaction: unknown; result: { result: boolean } }>
        sendTrx: (
          toAddress: string,
          amount: number,
          fromAddress: string
        ) => Promise<unknown>
      }
      trx: {
        sign: (transaction: unknown) => Promise<unknown>
        sendRawTransaction: (signedTx: unknown) => Promise<{ result: boolean; txid: string }>
        getBalance: (address: string) => Promise<number>
      }
      toSun: (amount: number) => number
      contract: () => {
        at: (address: string) => Promise<{
          transfer: (toAddress: string, amount: string) => { send: () => Promise<string> }
          balanceOf: (address: string) => { call: () => Promise<bigint> }
        }>
      }
      BigNumber: new (value: string | number) => { toString: () => string }
    }
  }
}

type Step = 'connect' | 'confirm' | 'sending' | 'done' | 'error'

export default function PayPage() {
  const [payParams, setPayParams] = useState<PayParams | null>(null)
  const [step, setStep] = useState<Step>('connect')
  const [txHash, setTxHash] = useState('')
  const [errMsg, setErrMsg] = useState('')
  const [walletInjected, setWalletInjected] = useState(false)

  const { address, isConnected } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider('tron')
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
    if (!payParams || !address) return
    setStep('sending')
    setErrMsg('')

    try {
      const tronWeb = window.tronWeb
      if (!tronWeb) throw new Error('未检测到 TronWeb，请在钱包内置浏览器中打开')

      let hash = ''

      if (isUSDT(payParams.currency)) {
        // USDT TRC20 转账
        const contract = await tronWeb.contract().at(USDT_CONTRACT)
        // USDT 精度为 6
        const amountSun = BigInt(Math.round(parseFloat(payParams.amount) * 1_000_000)).toString()
        hash = await contract.transfer(payParams.toAddress, amountSun).send()
      } else {
        // TRX 原生转账
        const amountSun = tronWeb.toSun(parseFloat(payParams.amount))
        const tx = await tronWeb.transactionBuilder.sendTrx(
          payParams.toAddress,
          amountSun,
          address
        )
        const signedTx = await tronWeb.trx.sign(tx)
        const result = await tronWeb.trx.sendRawTransaction(signedTx)
        if (!result.result) throw new Error('广播交易失败')
        hash = result.txid
      }

      setTxHash(hash)
      setStep('done')

      // 回调 App
      callAppBridge({ hash, status: 'success' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
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
          <p>交易提交中，请在钱包内确认...</p>
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
