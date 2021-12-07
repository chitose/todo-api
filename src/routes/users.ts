import { getUserRepository } from '@daos/repositories';
import { Request, Response, Router } from 'express';
import { StatusCodes } from 'http-status-codes';

const repo = getUserRepository();

async function getAllUsers(req: Request, res: Response) {
    const users = await repo.getAll();
    return res.status(StatusCodes.OK).json(users);
}

async function searchUsers(req: Request, res: Response) {
    const { text } = req.params;
    const users = await repo.search(text);
    return res.status(StatusCodes.OK).json(users);
}

// User-route
const userRouter = Router();
userRouter.get('/all', getAllUsers);
userRouter.get('/search/:text?', searchUsers);

export default userRouter;