import { useEffect, useState } from 'react'
import { useAppKitAccount, useAppKit, useAppKitNetwork } from '@reown/appkit/react'
import { useWalletClient, useSendTransaction, useWriteContract } from 'wagmi'
import { parseEther, parseUnits, erc20Abi } from 'viem'
import { mainnet, bsc } from '@reown/appkit/networks'
import { callAppBridge } from '../utils/jsbridge'
import { isEvmNative, isEvmToken, getEvmContract, type PayParams } from '../utils/params'
import WalletGuide from './WalletGuide'
import './PayPage.css'

// AppKit 网络的 chainId（number）
const CHAIN_ID_MAP: Record<string, number> = {
  eth: mainnet.id,  // 1
  bsc: bsc.id,      // 56
}

const NETWORK_LABEL: Record<string, string> = {
  eth: 'Ethereum',
  bsc: 'BNB Chain',
}

const EXPLORER_MAP: Record<string, string> = {
  eth: 'https://etherscan.io/tx',
  bsc: 'https://bscscan.com/tx',
}

type Step = 'connect' | 'switch' | 'confirm' | 'sending' | 'done' | 'error'

interface Props {
  payParams: PayParams
}

export default function EvmTransfer({ payParams }: Props) {
  // ── 所有 hooks 必须无条件放在最前面 ──────────────────────────
  const [step, setStep] = useState<Step>('connect')
  const [txHash, setTxHash] = useState('')
  const [errMsg, setErrMsg] = useState('')
  const [evmInjected, setEvmInjected] = useState(false)

  const { address, isConnected } = useAppKitAccount()
  const { caipNetwork, switchNetwork } = useAppKitNetwork()
  const { open } = useAppKit()
  const { data: walletClient } = useWalletClient()
  const { sendTransactionAsync } = useSendTransaction()
  const { writeContractAsync } = useWriteContract()

  // 检测 window.ethereum 注入
  useEffect(() => {
    const check = () => setEvmInjected(!!(window as { ethereum?: unknown }).ethereum)
    check()
    const t = setTimeout(check, 1500)
    return () => clearTimeout(t)
  }, [])

  // 根据连接/网络状态推进步骤
  const targetChainId = CHAIN_ID_MAP[payParams.network]
  const isCorrectNetwork = (caipNetwork?.id as number | undefined) === targetChainId

  useEffect(() => {
    if (!isConnected) {
      setStep('connect')
    } else if (!isCorrectNetwork) {
      setStep('switch')
    } else {
      setStep(prev => (prev === 'connect' || prev === 'switch') ? 'confirm' : prev)
    }
  }, [isConnected, isCorrectNetwork])

  // ── 条件渲染（不影响 hook 调用顺序）────────────────────────
  if (!evmInjected && !isConnected) {
    return <WalletGuide network="evm" />
  }

  const networkLabel = NETWORK_LABEL[payParams.network] ?? payParams.network.toUpperCase()
  const explorer = EXPLORER_MAP[payParams.network] ?? 'https://etherscan.io/tx'

  async function handleSwitch() {
    try {
      const networkObj = payParams.network === 'bsc' ? bsc : mainnet
      await switchNetwork(networkObj)
    } catch { /* 用户取消 */ }
  }

  async function handleTransfer() {
    if (!address || !walletClient) return
    setStep('sending')
    setErrMsg('')

    try {
      let hash = ''

      if (isEvmNative(payParams.currency, payParams.network)) {
        // ETH / BNB 原生转账
        hash = await sendTransactionAsync({
          to: payParams.toAddress as `0x${string}`,
          value: parseEther(payParams.amount),
        })
      } else if (isEvmToken(payParams.currency, payParams.network)) {
        // ERC20 / BEP20 合约转账（USDT 精度 6 位）
        const contractAddress = getEvmContract(payParams.currency, payParams.network) as `0x${string}`
        hash = await writeContractAsync({
          address: contractAddress,
          abi: erc20Abi,
          functionName: 'transfer',
          args: [
            payParams.toAddress as `0x${string}`,
            parseUnits(payParams.amount, 6),
          ],
        })
      } else {
        throw new Error(`不支持的币种: ${payParams.currency}`)
      }

      setTxHash(hash)
      setStep('done')
      callAppBridge({ hash, status: 'success' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      if (/reject|cancel|denied|user/i.test(message)) {
        setStep('confirm')
        return
      }
      let friendlyMsg = message
      if (/insufficient funds/i.test(message)) {
        friendlyMsg = `余额不足，请确保账户有足够 ${payParams.currency} 和 Gas 费`
      } else if (/gas/i.test(message)) {
        friendlyMsg = 'Gas 费不足，请确保账户有足够原生币支付手续费'
      }
      setErrMsg(friendlyMsg)
      setStep('error')
      callAppBridge({ hash: '', status: 'failed', error: friendlyMsg })
    }
  }

  return (
    <div>
      {step === 'connect' && (
        <div className="pay-step">
          <p className="pay-step-desc">请先连接 EVM 钱包</p>
          <button className="pay-btn" onClick={() => open()}>连接钱包</button>
        </div>
      )}

      {step === 'switch' && (
        <div className="pay-step">
          <p className="pay-step-desc">请切换到 <strong>{networkLabel}</strong> 网络</p>
          <button className="pay-btn" onClick={handleSwitch}>切换到 {networkLabel}</button>
          <button className="pay-btn-outline" onClick={() => open()}>切换钱包</button>
        </div>
      )}

      {step === 'confirm' && (
        <div className="pay-step">
          <div className="pay-connected-info">
            <span className="pay-dot" />
            <span>{networkLabel} · {address?.slice(0, 6)}...{address?.slice(-4)}</span>
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
          <a className="pay-link" href={`${explorer}/${txHash}`} target="_blank" rel="noreferrer">
            在区块链浏览器查看
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
