import 'express-async-errors';

import logger from '@shared/logger';
import cookieParser from 'cookie-parser';
import express, { NextFunction, Request, Response } from 'express';
import session from 'express-session';
import helmet from 'helmet';
import StatusCodes from 'http-status-codes';
import morgan from 'morgan';

import { configureAuthentication } from './config/authentication';
import BaseRouter from './routes';


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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

configureAuthentication(app, APP_SECRET);

// Show routes called in console during development
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Security
if (process.env.NODE_ENV === 'production') {
    app.use(helmet());
}

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

// Export express instance
export default app;
