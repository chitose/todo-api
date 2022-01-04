import { getUserRepository } from '@daos/repositories';
import { Request, Response, Router } from 'express';
import { StatusCodes } from 'http-status-codes';

const repo = getUserRepository();

/**
 * GET /api/users/all
 *
 * @summary Return all users
 * @return {array<User>} 200 - success response
 * @security jwt
 */
async function getAllUsers(req: Request, res: Response) {
    const users = await repo.getAll();
    return res.status(StatusCodes.OK).json(users);
}

/**
 * GET /api/users/search/{query}
 *
 * @summary Search user
 * @param {string} query.path.required - The search text
 * @return {array<User>} 200 - success response
 * @security jwt
 */
async function searchUsers(req: Request, res: Response) {
    const { text } = req.params;
    const users = await repo.search(text);
    return res.status(StatusCodes.OK).json(users);
}

/**
 * GET /api/users/validate
 * @summary Validate user authentication
 * @return 204 - Success response
 * @return 401 - Invalid authentication
 * @security jwt
 */
function validateUser(req: Request, res: Response) {
    return res.status(StatusCodes.NO_CONTENT).send();
}

// User-route
const userRouter = Router();
userRouter.get('/all', getAllUsers);
userRouter.get('/search/:text?', searchUsers);
userRouter.get('/validate', validateUser);

export default userRouter;