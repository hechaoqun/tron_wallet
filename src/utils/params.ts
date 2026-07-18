export interface PayParams {
  currency: string   // 币种，如 USDT / TRX
  toAddress: string  // 收款地址
  amount: string     // 金额（字符串，避免精度丢失）
  network: string    // 网络，如 tron
}

// 从 URL query string 解析充值参数
export function parsePayParams(): PayParams | null {
  const params = new URLSearchParams(window.location.search)

  const currency = params.get('currency')
  const toAddress = params.get('toAddress')
  const amount = params.get('amount')
  const network = params.get('network')

  if (!currency || !toAddress || !amount || !network) {
    return null
  }

  return { currency, toAddress, amount, network }
}

// USDT (TRC20) 合约地址
export const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'

// 是否是 USDT 转账（TRC20）
export function isUSDT(currency: string): boolean {
  return currency.toUpperCase() === 'USDT'
}
