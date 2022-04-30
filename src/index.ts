import './pre-start';

import db from '@daos/sqlite3/sqlite-dao';
import logger from '@shared/logger';
import jwt from 'jsonwebtoken';
import createServer from 'src/server';

import { getUserRepository, IUserAttribute } from './daos';

logger.info(`Environment: ${String(process.env.NODE_ENV)}`);
logger.info('Synchronizing database...');
db.sync({ force: false }).then(() => {
    logger.info('Database is synchronized.');
    // Start the server
    const port = Number(process.env.PORT || 3000);
    const userRepo = getUserRepository();
    const APP_SECRET = process.env.APP_SECRET as string;

    const userId = 'swaggerTestUser';
    const startSwaggerApp = (user: IUserAttribute) => {
        const token = jwt.sign({
            id: user.id
        }, APP_SECRET);
        const app = createServer(token);
        app.listen(port, () => {
            logger.info('Express server started: http://localhost:' + port);
            logger.info(`Swagger UI: http://localhost:${port}/api-docs`);
        });
    };
    userRepo.getUser(userId).then(user => {
        if (!user) {
            userRepo.addUser({
                id: 'swaggerTestUser',
                displayName: 'Swagger Test User',
                provider: 'Swagger-UI'
            }).then(user => startSwaggerApp(user));
        } else {
            startSwaggerApp(user);
        }
    });
});


