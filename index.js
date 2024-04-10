const sqlite3 = require("sqlite3").verbose();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());

const db = new sqlite3.Database("vend.db", (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to the database.");
  }
});

app.get("/search", (req, res) => {
  const itemName = req.query.name;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 15;
  const offset = (page - 1) * limit;

  db.all(
    `SELECT *,
     CASE 
       WHEN price LIKE '%per World Locks' THEN -1 * CAST(SUBSTR(price, 1, INSTR(price, ' ') - 1) AS INTEGER) 
       WHEN price LIKE '%World Lock Each' THEN CAST(SUBSTR(price, 1, INSTR(price, ' ') - 1) AS INTEGER) 
       ELSE 999999 
     END AS price_sort 
     FROM worlds 
     WHERE item LIKE ? 
     ORDER BY price_sort ASC
     LIMIT ? OFFSET ?`,
    [`%${itemName}%`, limit, offset],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (rows.length === 0) {
        res.status(404).json({ message: "Item not found" });
        return;
      }

      db.get(
        `SELECT COUNT(*) as count FROM worlds WHERE item LIKE ?`,
        [`%${itemName}%`],
        (err, result) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }

          const totalCount = result.count;
          const totalPages = Math.ceil(totalCount / limit);
          const pageInfo = {
            totalResults: totalCount,
            totalPages: totalPages,
            currentPage: page,
          };

          res.json({ results: rows, pageInfo });
        }
      );
    }
  );
});

app.post("/add-item", express.json(), (req, res) => {
  const { world, location, item, price, accessible, date } = req.body;

  if (!world || !location || !item || !price || !accessible || !date) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  db.run(
    "INSERT INTO worlds (world, location, item, price, accessible, date) VALUES (?, ?, ?, ?, ?, ?)",
    [world, location, item, price, accessible, date],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res
        .status(201)
        .json({ message: "Item added successfully", itemId: this.lastID });
    }
  );
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

process.on("SIGINT", () => {
  db.close((err) => {
    if (err) {
      console.error("Error closing database:", err.message);
    } else {
      console.log("Database connection closed.");
    }
    process.exit(0);
  });
});
