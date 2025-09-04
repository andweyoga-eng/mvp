import express from 'express';
import apiRoutes from './routes';
import { createServer } from 'vite';

const app = express();
const PORT = 5000;

app.use(express.json());
app.use('/api', apiRoutes);

async function startServer() {
  // Create Vite server in middleware mode
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });

  // Use vite's connect instance as middleware
  app.use(vite.ssrFixStacktrace);
  app.use(vite.middlewares);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(console.error);