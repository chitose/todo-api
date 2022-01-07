import { ILabelCreationAttribute, IUserAttribute } from '@daos/models';
import { getLabelRepository } from '@daos/repositories';
import { getKey } from '@shared/utils';
import { Request, Response, Router } from 'express';
import { StatusCodes } from 'http-status-codes';

import { RouteParams } from './route-params';

const labelRepo = getLabelRepository();

export class LabelRouteUrlBuilder {
    constructor(private relative = true) { }

    public createLabel() {
        return this.getUrl('/');
    }

    public getLabels() {
        return this.createLabel();
    }

    public search(query?: string) {
        return `${this.getUrl('/search')}/${query ? query : ':query?'}`;
    }

    public delete(id?: number | string) {
        return this.rename(id);
    }

    public rename(labelId?: number | string) {
        return this.getUrl(`/${labelId ? labelId : ':' + getKey<RouteParams>('labelId')}`);
    }

    public swapOrder(labelId?: number | string, targetLabelId?: number | string) {
        return `${this.rename(labelId)}/swap/${targetLabelId ? targetLabelId : ':' + getKey<RouteParams>('targetLabelId')}`;
    }

    private getUrl(url: string) {
        return !this.relative ? '/api/labels' + url : url;
    }
}


/**
 * PUT /api/labels
 * @summary Create a new label
 * @param {LabelCreation} request.body.required - Label creation info
 * @return {Label} 201 - Success response
 * @security jwt
 */
async function createLabel(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const lbl = await labelRepo.createLabel(user.id, req.body);
    return res.status(StatusCodes.CREATED).json(lbl);
}

/**
 * GET /api/labels
 * @summary Get all user labels
 * @return {array<Label>} 200 - Success response
 * @security jwt
 */
async function getLabels(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const lbls = await labelRepo.getLabels(user.id);
    return res.status(StatusCodes.OK).json(lbls);
}

/**
 * POST /api/labels/{labelId}
 * @summary Rename label
 * @param {LabelCreation} request.body.required - Update info (only the name)
 * @return {Label} 200 - Success response
 * @security jwt
 */
async function renameLabel(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const { labelId } = new RouteParams(req);
    const lbl = await labelRepo.renameLabel(user.id, labelId, (req.body as ILabelCreationAttribute).title);
    return res.status(StatusCodes.OK).json(lbl);
}

/**
 * DELETE /api/labels/{labelId}
 * @summary Delete the label
 * @return 204 - Success response
 */
async function deleteLabel(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const { labelId } = new RouteParams(req);
    await labelRepo.deleteLabel(user.id, labelId);
    return res.status(StatusCodes.NO_CONTENT).send();
}

/**
 * POST /api/labels/{labelId}/swap/{targetLabelId}
 * @summary Swap labels order
 * @param {number} labelId.path.required - The source label id
 * @param {number} targetLabelId.path.required - The target label id
 * @return 200 - Success response
 * @security jwt
 */
async function swapOrder(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const { labelId, targetLabelId } = new RouteParams(req);

    const lbls = await labelRepo.swapLabelOrder(user.id, labelId, targetLabelId);
    return res.status(StatusCodes.OK).json(lbls);
}

/**
 * GET /api/labels/search/{query}
 * @summary Swap labels order
 * @param {string} query.path - The search text
 * @return {array<Label>} 200 - Success response
 * @security jwt
 */
async function searchLabels(req: Request, res: Response) {
    const user = req.user as IUserAttribute;
    const { query } = req.params;

    const lbls = await labelRepo.search(user.id, query);
    return res.status(StatusCodes.OK).json(lbls);
}

const labelUrlBuilder = new LabelRouteUrlBuilder();

const labelRouter = Router();

labelRouter.put(labelUrlBuilder.createLabel(), createLabel);
labelRouter.get(labelUrlBuilder.getLabels(), getLabels);
labelRouter.post(labelUrlBuilder.rename(), renameLabel);
labelRouter.post(labelUrlBuilder.swapOrder(), swapOrder);
labelRouter.delete(labelUrlBuilder.delete(), deleteLabel);
labelRouter.get(labelUrlBuilder.search(), searchLabels);

export default labelRouter;