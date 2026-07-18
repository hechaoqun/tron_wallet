/**
 * Mock 后端服务
 * 模拟 TronLink DeepLink transfer 的后端回调接口
 *
 * 启动: node mock-server.cjs
 * 端口: 3001
 *
 * 接口:
 *   POST /api/tron/callback  ← TronLink 转账完成后回调
 *   GET  /api/tron/result    ← H5 轮询查询结果
 *   POST /api/tron/mock-success ← 手动触发成功（模拟 TronLink 回调，便于测试）
 */

const express = require('express')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.json())

// 内存存储: actionId → result
const store = new Map()

// ── TronLink 回调接口 ────────────────────────────────────────
// TronLink 转账成功/失败后 POST 到此接口
// Body: { actionId, code, message, transactionHash }
app.post('/api/tron/callback', (req, res) => {
  const { actionId, code, message, transactionHash } = req.body
  console.log('[Callback] 收到 TronLink 回调:', req.body)

  if (!actionId) {
    return res.status(400).json({ error: 'actionId 缺失' })
  }

  store.set(actionId, {
    actionId,
    code: code ?? 0,
    message: message ?? 'success',
    txHash: transactionHash ?? '',
    receivedAt: Date.now(),
  })

  res.json({ success: true })
})

// ── H5 轮询查询接口 ──────────────────────────────────────────
// H5 每 3 秒调用，查询 actionId 对应的转账结果
// Query: ?actionId=xxx
app.get('/api/tron/result', (req, res) => {
  const { actionId } = req.query
  console.log('[Poll] 查询 actionId:', actionId)

  if (!actionId) {
    return res.status(400).json({ error: 'actionId 缺失' })
  }

  const result = store.get(actionId)
  if (!result) {
    // 尚未收到回调，返回 pending
    return res.json({ status: 'pending' })
  }

  if (result.code === 0) {
    return res.json({ status: 'success', txHash: result.txHash, address: result.address })
  } else {
    return res.json({ status: 'failed', message: result.message })
  }
})

// ── 测试辅助接口：手动模拟 TronLink 回调 ─────────────────────
// login 回调: { actionId, address }
// transfer 回调: { actionId, txHash }
app.post('/api/tron/mock-success', (req, res) => {
  const { actionId, txHash, address } = req.body
  console.log('[Mock] 手动触发:', req.body)

  if (!actionId) return res.status(400).json({ error: 'actionId 缺失' })

  const result = {
    actionId,
    code: 0,
    message: 'success',
    txHash: txHash || '',
    address: address || '',
    receivedAt: Date.now(),
  }
  store.set(actionId, result)
  res.json({ success: true, ...result })
})

// ── 查看所有存储（调试用）────────────────────────────────────
app.get('/api/tron/debug', (req, res) => {
  res.json(Object.fromEntries(store))
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`\n✅ Mock Server 已启动: http://localhost:${PORT}`)
  console.log('  POST /api/tron/callback     ← TronLink 回调')
  console.log('  GET  /api/tron/result       ← H5 轮询查询')
  console.log('  POST /api/tron/mock-success ← 手动模拟成功（测试用）')
  console.log('  GET  /api/tron/debug        ← 查看所有数据\n')
})
