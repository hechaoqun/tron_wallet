export interface PayParams {
  currency: string   // 币种：USDT / TRX / ETH / BNB
  toAddress: string  // 收款地址
  amount: string     // 金额字符串
  network: string    // tron / eth / bsc
}

export function parsePayParams(): PayParams | null {
  const params = new URLSearchParams(window.location.search)
  const currency = params.get('currency')
  const toAddress = params.get('toAddress')
  const amount = params.get('amount')
  const network = params.get('network')
  if (!currency || !toAddress || !amount || !network) return null
  return { currency, toAddress, amount, network }
}

// 判断是否 EVM 网络
export function isEvm(network: string): boolean {
  return network === 'eth' || network === 'bsc'
}

// ── Tron ──────────────────────────────────────────────
export const USDT_TRC20 = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'

export function isTronUSDT(currency: string): boolean {
  return currency.toUpperCase() === 'USDT'
}

// ── EVM ───────────────────────────────────────────────
// USDT 合约地址
export const EVM_CONTRACTS: Record<string, Record<string, string>> = {
  eth: {
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  },
  bsc: {
    USDT: '0x55d398326f99059fF775485246999027B3197955',
  },
}

// EVM 原生币
export const EVM_NATIVE: Record<string, string> = {
  eth: 'ETH',
  bsc: 'BNB',
}

// 判断是否 EVM 原生币转账
export function isEvmNative(currency: string, network: string): boolean {
  return currency.toUpperCase() === EVM_NATIVE[network]?.toUpperCase()
}

// 判断是否 EVM ERC20/BEP20 转账
export function isEvmToken(currency: string, network: string): boolean {
  return !isEvmNative(currency, network) && !!EVM_CONTRACTS[network]?.[currency.toUpperCase()]
}

// 获取 EVM 代币合约地址
export function getEvmContract(currency: string, network: string): string {
  return EVM_CONTRACTS[network]?.[currency.toUpperCase()] ?? ''
}
