const ley = require('ley');
import {app} from './app';
import {logger} from './logger';
import {config} from './config';

app.listen(config.port, async () => {
  await ley.up({
    cwd: '.',
    dir: 'migrations',
    driver: 'postgres',
  });

  logger.info(
    {},
    `Hello, My Friendo! API server listening on port ${config.port}...`
  );
});
