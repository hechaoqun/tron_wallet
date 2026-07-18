export interface TransferResult {
  hash: string
  status: 'success' | 'failed'
  error?: string
}

// 检测当前环境
export function detectEnv(): 'ios' | 'android' | 'browser' {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'browser'
}

// 回调转账结果给 App
export function callAppBridge(result: TransferResult): void {
  const env = detectEnv()
  const payload = JSON.stringify(result)

  try {
    if (env === 'ios') {
      // iOS JSBridge
      const w = window as unknown as {
        webkit?: { messageHandlers?: { onTransferResult?: { postMessage: (data: TransferResult) => void } } }
      }
      if (w.webkit?.messageHandlers?.onTransferResult) {
        w.webkit.messageHandlers.onTransferResult.postMessage(result)
        return
      }
    }

    if (env === 'android') {
      // Android JSBridge
      const w = window as unknown as {
        AndroidBridge?: { onTransferResult: (data: string) => void }
      }
      if (w.AndroidBridge?.onTransferResult) {
        w.AndroidBridge.onTransferResult(payload)
        return
      }
    }

    // 浏览器开发调试：打印结果
    console.log('[JSBridge] 回调结果:', result)
  } catch (err) {
    console.error('[JSBridge] 回调失败:', err)
  }
}
