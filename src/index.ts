import { Hono } from 'hono'
import { cors } from 'hono/cors'
import api from './routes/api'

const app = new Hono()
// CORSミドルウェアをアプリケーション全体に適用
app.use('/*', cors({
  origin: '*', // 特定のオリジンを許可
  // または origin: '*' で全てのオリジンを許可
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'], // 許可するHTTPメソッド
  allowHeaders: ['Content-Type', 'Authorization'], // 許可するヘッダー
  exposeHeaders: ['Content-Length'], // クライアントに公開するヘッダー
  maxAge: 86400, // プリフライトリクエストの結果をキャッシュする時間（秒）
  credentials: true, // Cookieを含むリクエストを許可する
}))

app.route('/api', api)

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

export default app
