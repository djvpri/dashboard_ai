import postgres from 'postgres'

// null kalau DATABASE_URL belum di-set ATAU formatnya tidak valid —
// endpoint yang memakainya harus cek null dan gagal dengan aman (503),
// bukan crash seluruh proses saat modul ini pertama di-import.
//
// PENTING: postgres() bisa throw SYNCHRONOUS saat dipanggil kalau string
// URL-nya tidak valid sama sekali (dibuktikan empiris) — kalau modul ini
// diimpor sebagai bagian dari bundel server Next.js, throw yang tidak
// ditangani di sini akan menjatuhkan SELURUH server saat boot, bukan
// cuma endpoint yang butuh DB. try/catch di sini krusial.
const DATABASE_URL = process.env.DATABASE_URL

let sql: ReturnType<typeof postgres> | null = null
try {
  sql = DATABASE_URL ? postgres(DATABASE_URL, { ssl: 'require' }) : null
} catch (err) {
  console.error('[lib/db] Gagal membuat koneksi Postgres (DATABASE_URL tidak valid?):', err)
  sql = null
}

export default sql
