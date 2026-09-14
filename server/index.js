import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import db from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
app.use(cors())
app.use(express.json())

// ให้บริการไฟล์ Static จากโฟลเดอร์ public
app.use(express.static(path.join(__dirname, '../public')))

// เข้าหน้าแรก (index.html) โดยตรง ไม่ต้องผ่าน Login
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'))
})

// ---- CRUD API จัดการสินค้า ----

// 1. ดึงรายการสินค้าทั้งหมด
app.get('/api/products', (req, res) => {
  db.query('SELECT * FROM products ORDER BY id DESC', (err, results) => {
    if (err) return res.status(500).json(err)
    res.json(results)
  })
})

// 2. ค้นหาสินค้า
app.get('/api/products/search', (req, res) => {
  const q = req.query.q || ''
  const search = `%${q}%`
  db.query(
    'SELECT * FROM products WHERE code LIKE ? OR name LIKE ? OR category LIKE ?',
    [search, search, search],
    (err, results) => {
      if (err) return res.status(500).json(err)
      res.json(results)
    }
  )
})

// 3. เพิ่มสินค้าใหม่
app.post('/api/products', (req, res) => {
  const { code, name, category, cost_price, sell_price, quantity, unit } = req.body
  const sql = 'INSERT INTO products (code, name, category, cost_price, sell_price, quantity, unit) VALUES (?, ?, ?, ?, ?, ?, ?)'
  db.query(sql, [code, name, category, cost_price, sell_price, quantity, unit], (err, result) => {
    if (err) return res.status(500).json(err)
    res.json({ success: true, id: result.insertId })
  })
})

// 4. ลบสินค้า
app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params
  db.query('DELETE FROM products WHERE id = ?', [id], (err, result) => {
    if (err) return res.status(500).json(err)
    res.json({ success: true })
  })
})

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000')
})