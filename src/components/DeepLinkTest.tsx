import './DeepLinkTest.css'

import { useEffect, useRef, useState } from 'react'

import { callAppBridge } from '../utils/jsbridge'
import { isTronUSDT as isUSDT, parsePayParams, USDT_TRC20 as USDT_CONTRACT } from '../utils/params'

// TronLink 主网 chainId
const TRON_CHAIN_ID = '0x2b6653dc'

// DApp 页面 URL（必填字段）
const DAPP_URL = window.location.origin + window.location.pathname + window.location.search

// callbackUrl：指向 mock server（生产环境替换为真实后端地址）
const CALLBACK_BASE = `${window.location.origin}/api/tron`

// 轮询配置
const POLL_INTERVAL = 3000
const POLL_TIMEOUT = 120_000

type Step = 'ready' | 'login_waiting' | 'confirm' | 'transfer_waiting' | 'done' | 'timeout' | 'failed'

// 生成 UUID v4
function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

// 构造 action:login DeepLink（获取用户钱包地址）
function buildLoginDeepLink(actionId: string): string {
  const payload = {
    action: 'login',
    protocol: 'TronLink',
    version: '1.0',
    chainId: TRON_CHAIN_ID,
    url: DAPP_URL,
    callbackUrl: `${CALLBACK_BASE}/callback`,
    dappName: 'Crypto Recharge',
    dappIcon: `${window.location.origin}/favicon.ico`,
    actionId,
  }
  return `tronlinkoutside://pull.activity?param=${encodeURIComponent(JSON.stringify(payload))}`
}

// 构造 action:transfer DeepLink
function buildTransferDeepLink(params: {
  toAddress: string
  amount: string
  isUsdt: boolean
  fromAddress: string
  actionId: string
}): string {
  const payload = {
    action: 'transfer',
    protocol: 'TronLink',
    version: '1.0',
    chainId: TRON_CHAIN_ID,
    url: DAPP_URL,
    callbackUrl: `${CALLBACK_BASE}/callback`,
    dappName: 'Crypto Recharge',
    dappIcon: `${window.location.origin}/favicon.ico`,
    from: params.fromAddress,
    to: params.toAddress,
    loginAddress: params.fromAddress,
    // tokenId 与 contract 互斥：TRX 用 tokenId:"0" + contract:""，USDT 用 tokenId:"" + contract:"合约"
    tokenId: params.isUsdt ? '' : '0',
    contract: params.isUsdt ? USDT_CONTRACT : '',
    amount: params.amount,
    actionId: params.actionId,
  }
  return `tronlinkoutside://pull.activity?param=${encodeURIComponent(JSON.stringify(payload))}`
}

export default function DeepLinkTest() {
  const payParams = parsePayParams()

  const [step, setStep] = useState<Step>('ready')
  const [loginActionId] = useState(() => uuid())
  const [transferActionId] = useState(() => uuid())
  const [walletAddress, setWalletAddress] = useState('')
  const [txHash, setTxHash] = useState('')
  const [errMsg, setErrMsg] = useState('')
  const [countdown, setCountdown] = useState(POLL_TIMEOUT / 1000)
  const [copyTip, setCopyTip] = useState('')

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTime = useRef(0)
  const currentActionId = useRef('')

  function stopPolling() {
    if (pollTimer.current) clearInterval(pollTimer.current)
    if (countdownTimer.current) clearInterval(countdownTimer.current)
  }

  function startPolling(actionId: string, onSuccess: (data: Record<string, string>) => void) {
    currentActionId.current = actionId
    startTime.current = Date.now()
    setCountdown(POLL_TIMEOUT / 1000)

    countdownTimer.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime.current) / 1000)
      setCountdown(Math.max(0, POLL_TIMEOUT / 1000 - elapsed))
    }, 1000)

    pollTimer.current = setInterval(async () => {
      if (Date.now() - startTime.current >= POLL_TIMEOUT) {
        stopPolling()
        setStep('timeout')
        return
      }
      try {
        const res = await fetch(`/api/tron/result?actionId=${actionId}`)
        const data = await res.json()
        if (data.status === 'success') {
          stopPolling()
          onSuccess(data)
        } else if (data.status === 'failed') {
          stopPolling()
          setErrMsg(data.message ?? '操作失败')
          setStep('failed')
        }
      } catch { /* 继续等待 */ }
    }, POLL_INTERVAL)
  }

  // 第一步：唤起 TronLink 登录获取地址
  function handleLogin() {
    const deepLink = buildLoginDeepLink(loginActionId)
    window.location.href = deepLink
    setStep('login_waiting')

    startPolling(loginActionId, (data) => {
      const address = data.address
      if (!address) {
        setErrMsg('未获取到钱包地址')
        setStep('failed')
        return
      }
      setWalletAddress(address)
      setStep('confirm')
    })
  }

  // 第二步：确认后唤起 TronLink 转账
  function handleTransfer() {
    if (!payParams || !walletAddress) return
    const deepLink = buildTransferDeepLink({
      toAddress: payParams.toAddress,
      amount: payParams.amount,
      isUsdt: isUSDT(payParams.currency),
      fromAddress: walletAddress,
      actionId: transferActionId,
    })
    window.location.href = deepLink
    setStep('transfer_waiting')

    startPolling(transferActionId, (data) => {
      setTxHash(data.txHash)
      setStep('done')
      callAppBridge({ hash: data.txHash, status: 'success' })
    })
  }

  // 手动 mock 回调（测试用）
  async function handleMockSuccess() {
    try {
      await fetch('/api/tron/mock-success', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId: currentActionId.current,
          // login 回调要带 address 字段，transfer 回调带 txHash
          ...(step === 'login_waiting'
            ? { address: 'TTestMockAddress123456789' }
            : { txHash: 'mock_tx_' + Date.now().toString(16) }),
        }),
      })
    } catch (e) {
      console.error('[Mock]', e)
    }
  }

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text)
    setCopyTip('已复制')
    setTimeout(() => setCopyTip(''), 2000)
  }

  useEffect(() => () => stopPolling(), [])

  // 参数缺失
  if (!payParams) {
    return (
      <div className="dl-container">
        <div className="dl-error-box">
          <div className="dl-icon">⚠️</div>
          <h3>参数缺失</h3>
          <p>需要: currency / toAddress / amount / network</p>
        </div>
      </div>
    )
  }

  const isWaiting = step === 'login_waiting' || step === 'transfer_waiting'
  const waitingLabel = step === 'login_waiting' ? '等待 TronLink 授权登录...' : '等待 TronLink 确认转账...'

  return (
    <div className="dl-container">
      <div className="dl-tag">DeepLink 测试页</div>

      {/* 充值信息卡 */}
      <div className="dl-card">
        <div className="dl-card-label">充值信息</div>
        <div className="dl-amount-row">
          <span className="dl-amount">{payParams.amount}</span>
          <span className="dl-currency">{payParams.currency}</span>
        </div>
        <div className="dl-info-row">
          <span className="dl-info-label">收款地址</span>
          <span className="dl-info-value">{payParams.toAddress}</span>
        </div>
        <div className="dl-info-row">
          <span className="dl-info-label">网络</span>
          <span className="dl-info-value">{payParams.network.toUpperCase()}</span>
        </div>
        {walletAddress && (
          <div className="dl-info-row">
            <span className="dl-info-label">钱包地址</span>
            <span className="dl-info-value">{walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}</span>
          </div>
        )}
      </div>

      {/* step: ready — 第一步登录 */}
      {step === 'ready' && (
        <div className="dl-step">
          <p className="dl-desc">先授权获取钱包地址，再发起转账</p>
          <button className="dl-btn" onClick={handleLogin}>
            第一步：连接 TronLink
          </button>
        </div>
      )}

      {/* step: confirm — 已获取地址，等待用户确认转账 */}
      {step === 'confirm' && (
        <div className="dl-step">
          <div className="dl-connected">
            <span className="dl-dot" />
            已连接：{walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
          </div>
          <button className="dl-btn" onClick={handleTransfer}>
            第二步：唤起 TronLink 转账
          </button>
        </div>
      )}

      {/* step: waiting — 等待 TronLink 回调 */}
      {isWaiting && (
        <div className="dl-step dl-center">
          <div className="dl-spinner" />
          <p>{waitingLabel}</p>
          <p className="dl-sub">剩余 {countdown}s</p>

          <div className="dl-mock-box">
            <p className="dl-mock-label">⚙️ 测试工具（无真机时使用）</p>
            <button className="dl-btn-mock" onClick={handleMockSuccess}>
              模拟 TronLink 回调成功
            </button>
            <p className="dl-mock-hint">或用 curl：</p>
            <code className="dl-code" onClick={() => copyText(
              step === 'login_waiting'
                ? `curl -X POST http://localhost:3001/api/tron/mock-success -H "Content-Type: application/json" -d '{"actionId":"${loginActionId}","address":"TTestMockAddr123"}'`
                : `curl -X POST http://localhost:3001/api/tron/mock-success -H "Content-Type: application/json" -d '{"actionId":"${transferActionId}","txHash":"mock_tx_abc123"}'`
            )}>
              {step === 'login_waiting'
                ? `# login mock\ncurl ... -d '{"actionId":"${loginActionId.slice(0,8)}...","address":"TTest..."}'`
                : `# transfer mock\ncurl ... -d '{"actionId":"${transferActionId.slice(0,8)}...","txHash":"mock_tx..."}'`
              }
              {copyTip && <span className="dl-copy-tip">{copyTip}</span>}
            </code>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="dl-step dl-center">
          <div className="dl-icon">✅</div>
          <h3>转账成功</h3>
          <p className="dl-hash-label">交易哈希</p>
          <p className="dl-hash">{txHash}</p>
          <a className="dl-link" href={`https://tronscan.org/#/transaction/${txHash}`} target="_blank" rel="noreferrer">
            在 TronScan 查看
          </a>
        </div>
      )}

      {step === 'timeout' && (
        <div className="dl-step dl-center">
          <div className="dl-icon">⏰</div>
          <h3>等待超时</h3>
          <p>未收到 TronLink 回调，请检查是否已确认</p>
          <button className="dl-btn" onClick={() => { setStep('ready'); setCountdown(POLL_TIMEOUT / 1000) }}>
            重新开始
          </button>
        </div>
      )}

      {step === 'failed' && (
        <div className="dl-step dl-center">
          <div className="dl-icon">❌</div>
          <h3>操作失败</h3>
          <p className="dl-error-msg">{errMsg}</p>
          <button className="dl-btn" onClick={() => setStep('ready')}>重试</button>
        </div>
      )}

      <p className="dl-footer">TronLink DeepLink 方案测试页 · 仅用于开发验证</p>
    </div>
  )
}
