const mysql = require('mysql2/promise');
require('dotenv').config();

// Creamos la conexión a MySQL usando las variables del archivo .env
const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  user:     process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port:     process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Verificamos que la conexión funcione al iniciar el servidor
pool.getConnection()
  .then(conn => {
    console.log('✅ Conectado a MySQL - Base de datos kccfood');
    conn.release();
  })
  .catch(err => {
    console.error('❌ Error conectando a MySQL:', err.message);
  });

module.exports = pool;