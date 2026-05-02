import dotenv from 'dotenv';
dotenv.config();

import { createHttpServer } from './httpServer';
import { createWorker } from './worker';
import { connectMongo } from './config/mongodb';
import { connectRedis } from './config/redis';
import { logger } from './config/logger';

const PORT = parseInt(process.env.PORT || '4009', 10);

async function bootstrap() {
  logger.info('Starting rez-action-engine...');
  await connectMongo();
  await connectRedis();

  const httpServer = createHttpServer();
  httpServer.listen(PORT, () => {
    logger.info(`rez-action-engine listening on port ${PORT}`);
  });

  await createWorker();
  logger.info('rez-action-engine bootstrapped successfully');
}

bootstrap().catch((err) => {
  logger.error('Failed to bootstrap', { error: err });
  process.exit(1);
});
