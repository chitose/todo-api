import { IUserAttribute } from '@daos/models';

declare module 'express' {
    export interface Request  {
        body: {
            user: IUserAttribute
        };
    }
}
