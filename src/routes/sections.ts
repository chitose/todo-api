import { IUserAttribute } from '@daos/models';
import { ISectionCreationAttribute } from '@daos/models/section';
import { getSectionRepository } from '@daos/repositories';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { RouteParams } from './route-params';

/* eslint-disable @typescript-eslint/no-non-null-assertion */
const sectionRepo = getSectionRepository();

export async function getSections(req: Request, res: Response) {
    const { projectId } = new RouteParams(req);
    const user = req.user as IUserAttribute;
    const sections = await sectionRepo.getSections(user.id, projectId);
    return res.status(StatusCodes.OK).json(sections);
}

export async function getSection(req: Request, res: Response) {
    const { projectId, sectionId } = new RouteParams(req);
    const user = req.user as IUserAttribute;
    const section = await sectionRepo.getSection(user.id, projectId, sectionId);
    return res.status(StatusCodes.OK).json(section);
}

export async function swapSectionOrder(req: Request, res: Response) {
    const { projectId, sectionId, targetSectionId } = new RouteParams(req);
    const user = req.user as IUserAttribute;
    try {
        const sections = await sectionRepo.swapOrder(user.id, projectId, sectionId, targetSectionId);
        return res.status(StatusCodes.OK).json(sections);
    } catch (e: any) {
        return res.status(StatusCodes.BAD_REQUEST).send({ message: e.message });
    }
}

export async function createSection(req: Request, res: Response) {
    const { projectId } = new RouteParams(req);
    const user = req.user as IUserAttribute;
    const json = req.body as Partial<ISectionCreationAttribute>;
    try {
        const sect = await sectionRepo.addSection(user.id, projectId, json.name!);
        return res.status(StatusCodes.CREATED).json(sect);
    } catch (e: any) {
        return res.status(StatusCodes.BAD_REQUEST).send({
            message: e.message
        });
    }
}

export async function updateSection(req: Request, res: Response) {
    const { projectId, sectionId } = new RouteParams(req);
    const user = req.user as IUserAttribute;
    const json = req.body as Partial<ISectionCreationAttribute>;
    try {
        const sect = await sectionRepo.updateSection(user.id, projectId, sectionId, json);
        return res.status(StatusCodes.OK).json(sect);
    } catch (e: any) {
        return res.status(StatusCodes.BAD_REQUEST).send({
            message: e.message
        });
    }
}

export async function deleteSection(req: Request, res: Response) {
    const { projectId, sectionId } = new RouteParams(req);
    const user = req.user as IUserAttribute;
    try {
        await sectionRepo.deleteSection(user.id, projectId, sectionId);
        return res.status(StatusCodes.NO_CONTENT).send();
    } catch (e: any) {
        return res.status(StatusCodes.BAD_REQUEST).send({
            message: e.message
        });
    }
}

export async function duplicateSection(req: Request, res: Response) {
    const { projectId, sectionId } = new RouteParams(req);
    const user = req.user as IUserAttribute;
    try {
        const sect = await sectionRepo.duplicateSection(user.id, projectId, sectionId);
        return res.status(StatusCodes.CREATED).json(sect);
    } catch (e: any) {
        return res.status(StatusCodes.BAD_REQUEST).send({
            message: e.message
        });
    }
}