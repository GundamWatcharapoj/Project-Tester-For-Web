import mysql from 'mysql2'

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'db_construction'
})

db.connect((err) => {
  if (err) console.error('Database connection failed:', err)
  else console.log('Connected to MySQL Database in XAMPP!')
})

export default db