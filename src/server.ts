import 'express-async-errors';

import logger from '@shared/logger';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import session from 'express-session';
import helmet from 'helmet';
import StatusCodes from 'http-status-codes';
import morgan from 'morgan';

import { configureAuthentication } from './config/authentication';
import setupSwagger from './docs/swagger';
import BaseRouter from './routes';

export default function createServer(swaggerTestUserToken: string): express.Express {
    const app = express();
    const { BAD_REQUEST } = StatusCodes;

    const APP_SECRET = process.env.APP_SECRET as string;


    /************************************************************************************
     *                              Set basic express settings
     ***********************************************************************************/

    app.use(session({
        resave: false,
        saveUninitialized: true,
        secret: APP_SECRET
    }));

    app.set('json replacer', function (key: string, value: any) {
        // convert sequalize date string to ISO format
        if (typeof (value) === 'string') {
            const match = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3} \+\d{2}:\d{2}$/.exec(value);
            if (match) {
                return new Date(value).toISOString();
            }
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return value;
    });

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());
    app.use(compression());

    if (swaggerTestUserToken) {
        setupSwagger(app, swaggerTestUserToken);
    }

    configureAuthentication(app, APP_SECRET);

    // Show routes called in console during development
    if (process.env.NODE_ENV === 'development') {
        app.use(morgan('dev'));
    }

    // Security
    if (process.env.NODE_ENV === 'production') {
        app.use(helmet());
    }

    // enable pre-flight across-the-board
    app.options('*', cors() as any) // include before other routes

    // Add APIs
    app.use('/api', BaseRouter);

    // Print API errors
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
        logger.err(err, true);
        return res.status(BAD_REQUEST).json({
            error: err.message,
        });
    });

    return app;
}
