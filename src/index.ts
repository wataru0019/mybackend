import { Hono } from 'hono'
import ai from './routes/ai'

const app = new Hono()
app.route('/ai', ai)

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

export default app
