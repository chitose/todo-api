import './pre-start';

import db from '@daos/sqlite3/sqlite-dao';
import logger from '@shared/logger';
import app from 'src/server';

logger.info(`Environment: ${String(process.env.NODE_ENV)}`);
logger.info('Synchronizing database...');
db.sync({ force: false }).then(() => {
    logger.info('Database is synchronized.');
    // Start the server
    const port = Number(process.env.PORT || 3000);
    app.listen(port, () => {
        logger.info('Express server started on port: ' + port);
    });
});


