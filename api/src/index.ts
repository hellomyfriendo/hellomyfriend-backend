import {app} from './app';
import {logger} from './logger';
import {config} from './config';

app.listen(config.port, () => {
  logger.info(
    {},
    `Hello, My Friendo! backend listening on port ${config.port}...`
  );
});
