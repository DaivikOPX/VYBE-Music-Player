import { createServer } from 'vite';
import { spawn } from 'child_process';
import electron from 'electron';

async function start() {
  try {
    const server = await createServer({
      configFile: './vite.config.ts',
      server: { port: 5173 }
    });
    await server.listen();

    const address = server.httpServer?.address();
    const port = typeof address === 'object' && address?.port ? address.port : 5173;
    const devUrl = `http://localhost:${port}`;
    console.log(`[VYBE Dev] Vite dev server ready at ${devUrl}`);

    const electronProcess = spawn(electron, ['.'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        VITE_DEV_SERVER_URL: devUrl
      }
    });

    electronProcess.on('close', async () => {
      console.log('[VYBE Dev] Electron process terminated, shutting down dev server...');
      await server.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      electronProcess.kill();
      await server.close();
      process.exit(0);
    });
  } catch (err) {
    console.error('[VYBE Dev] Failed to start live desktop dev runner:', err);
    process.exit(1);
  }
}

start();
