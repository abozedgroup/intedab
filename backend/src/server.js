require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { initializeDatabase } = require("./db");
const routes = require("./routes");

const PORT = process.env.PORT || 4000;
const app = express();

initializeDatabase();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", routes);

const frontendDistPath = path.join(__dirname, "..", "..", "frontend", "dist");
if (fs.existsSync(frontendDistPath)) {
  // في الإنتاج: نفس الخادم يقدّم واجهة React.
  app.use(express.static(frontendDistPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      next();
      return;
    }
    res.sendFile(path.join(frontendDistPath, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
