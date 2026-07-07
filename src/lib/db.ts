import postgres from 'postgres'

// null kalau DATABASE_URL belum di-set — endpoint yang memakainya harus
// cek null dan gagal dengan aman (503), bukan crash seluruh proses saat
// modul ini pertama di-import.
const DATABASE_URL = process.env.DATABASE_URL

const sql = DATABASE_URL ? postgres(DATABASE_URL, { ssl: 'require' }) : null

export default sql
