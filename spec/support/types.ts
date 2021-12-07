import { IUser } from '@entities/user';
import { Response } from 'supertest';


export interface IResponse extends Response {
    body: {
        users: IUser[];
        error: string;
    };
}

export interface IReqBody {
    user?: IUser;
}
