const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();

// Baca file teks secara sinkron
const data = fs.readFileSync("combined.txt", "utf8");

// Pisahkan data menjadi array berdasarkan baris-barisnya
const lines = data.split("\n");

// Inisialisasi array untuk menyimpan data yang akan dimasukkan ke database
let worlds = [];
let currentWorld = {};

// Loop melalui setiap baris data
for (let line of lines) {
  if (line.trim() === "") {
    // Jika menemukan baris kosong, artinya data untuk satu dunia telah selesai, tambahkan ke array worlds
    if (Object.keys(currentWorld).length > 0) {
      worlds.push(currentWorld);
      currentWorld = {};
    }
  } else {
    // Pisahkan nama properti dan nilainya dari setiap baris data
    const [key, ...valueParts] = line.split(": ");
    const value = valueParts.join(": ");

    if (key && value) {
      currentWorld[key.toLowerCase()] = value.trim();
    } else {
      console.log(`Baris tidak valid: ${line}`);
    }
  }
}

// Buka koneksi ke database SQLite (jika tidak ada, maka akan dibuat)
const db = new sqlite3.Database("vend.db");

// Buat tabel jika belum ada
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS worlds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        world TEXT,
        location TEXT,
        item TEXT,
        price TEXT,
        accessible TEXT,
        date TEXT
    )`);

  // Masukkan data ke dalam tabel menggunakan transaksi batch
  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    const insertStmt = db.prepare(
      `INSERT INTO worlds (world, location, item, price, accessible, date) VALUES (?, ?, ?, ?, ?, ?)`
    );
    for (let world of worlds) {
      insertStmt.run(
        world.world || null,
        world.location || null,
        world.item || null,
        world.price || null,
        world.accessible || null,
        world.date || null
      );
    }
    insertStmt.finalize();

    db.run("COMMIT", (err) => {
      if (err) {
        console.error(err.message);
      } else {
        console.log("Data imported successfully");
      }

      // Tutup koneksi setelah selesai
      db.close();
    });
  });
});
