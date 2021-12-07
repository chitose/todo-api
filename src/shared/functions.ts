export const pErr = (err: Error) => {
    if (err) {
        logger.err(err);
import logger from './logger';

    }
};

export const getRandomInt = () => {
    return Math.floor(Math.random() * 1_000_000_000_000);
};
