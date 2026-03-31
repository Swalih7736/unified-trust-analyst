import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Standard ES module pathing
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Serve the static production build files from Vite
app.use(express.static(join(__dirname, 'dist')));

// Ensure React routing works (catch-all routes)
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Trust Analyst Forensic UI serving on port ${PORT}`);
});
