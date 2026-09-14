import express from 'express'
import cors from 'cors'
import path from 'path'
import session from 'express-session'
import bcrypt from 'bcryptjs'
import { fileURLToPath } from 'url'
import db from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
app.use(cors({ origin: 'http://localhost:3000', credentials: true }))
app.use(express.json())

app.use(session({
  secret: 'construction-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 } // 8 ชั่วโมง
}))

// Middleware เช็คว่าล็อกอินแล้วหรือยัง
function requireLogin(req, res, next) {
  if (req.session && req.session.userId) return next()
  return res.status(401).json({ message: 'กรุณาเข้าสู่ระบบก่อน' })
}

// ---- Auth API ----
app.post('/api/login', (req, res) => {
  const { username, password } = req.body
  db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
    if (err) return res.status(500).json(err)
    if (results.length === 0) return res.status(401).json({ success: false, message: 'ไม่พบชื่อผู้ใช้นี้' })

    const user = results[0]
    const match = bcrypt.compareSync(password, user.password)
    if (!match) return res.status(401).json({ success: false, message: 'รหัสผ่านไม่ถูกต้อง' })

    req.session.userId = user.id
    req.session.username = user.username
    res.json({ success: true, username: user.username })
  })
})

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true })
  })
})

app.get('/api/me', (req, res) => {
  if (req.session && req.session.userId) {
    return res.json({ loggedIn: true, username: req.session.username })
  }
  res.json({ loggedIn: false })
})

// ---- Static files ----
// หน้า login เปิดได้เสมอ ไม่ต้องล็อกอิน
app.use(express.static(path.join(__dirname, '../public'), { index: false }))

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'))
})

// หน้าแรกต้องล็อกอินก่อนถึงจะเข้าได้
app.get('/', (req, res) => {
  if (!req.session.userId) return res.redirect('/login')
  res.sendFile(path.join(__dirname, '../public/index.html'))
})

// ---- Product API (ต้องล็อกอินก่อนถึงจะใช้ได้) ----
app.get('/api/products', requireLogin, (req, res) => {
  db.query('SELECT * FROM products ORDER BY id DESC', (err, results) => {
    if (err) return res.status(500).json(err)
    res.json(results)
  })
})

app.get('/api/products/search', requireLogin, (req, res) => {
  const { q } = req.query
  const keyword = `%${q || ''}%`
  const sql = 'SELECT * FROM products WHERE code LIKE ? OR name LIKE ? OR category LIKE ? ORDER BY id DESC'
  db.query(sql, [keyword, keyword, keyword], (err, results) => {
    if (err) return res.status(500).json(err)
    res.json(results)
  })
})

app.get('/api/products/:id', requireLogin, (req, res) => {
  const { id } = req.params
  db.query('SELECT * FROM products WHERE id = ?', [id], (err, results) => {
    if (err) return res.status(500).json(err)
    if (results.length === 0) return res.status(404).json({ message: 'Product not found' })
    res.json(results[0])
  })
})

app.post('/api/products', requireLogin, (req, res) => {
  const { code, name, category, cost_price, sell_price, quantity, unit } = req.body
  const sql = 'INSERT INTO products (code, name, category, cost_price, sell_price, quantity, unit) VALUES (?, ?, ?, ?, ?, ?, ?)'
  db.query(sql, [code, name, category, cost_price, sell_price, quantity, unit], (err, result) => {
    if (err) return res.status(500).json(err)
    res.json({ success: true, message: 'Added successfully', id: result.insertId })
  })
})

app.put('/api/products/:id', requireLogin, (req, res) => {
  const { id } = req.params
  const { code, name, category, cost_price, sell_price, quantity, unit } = req.body
  const sql = 'UPDATE products SET code=?, name=?, category=?, cost_price=?, sell_price=?, quantity=?, unit=? WHERE id=?'
  db.query(sql, [code, name, category, cost_price, sell_price, quantity, unit, id], (err) => {
    if (err) return res.status(500).json(err)
    res.json({ success: true, message: 'Updated successfully' })
  })
})

app.delete('/api/products/:id', requireLogin, (req, res) => {
  const { id } = req.params
  db.query('DELETE FROM products WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json(err)
    res.json({ success: true, message: 'Deleted successfully' })
  })
})

// หน้าเกี่ยวกับเรา ต้องล็อกอินก่อนถึงจะเข้าได้
app.get('/about', (req, res) => {
  if (!req.session.userId) return res.redirect('/login')
  res.sendFile(path.join(__dirname, '../public/about.html'))
})

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000')
})