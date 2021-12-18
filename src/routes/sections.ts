import { IUserAttribute } from '@daos/models';
import { ISectionCreationAttribute } from '@daos/models/section';
import { getSectionRepository } from '@daos/repositories';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { RouteParams } from './route-params';

/* eslint-disable @typescript-eslint/no-non-null-assertion */
const sectionRepo = getSectionRepository();

export async function getSections(req: Request, res: Response) {
    const projectId = Number(req.params[RouteParams.ProjectId]);
    const user = req.user as IUserAttribute;
    const sections = await sectionRepo.getSections(user.id, projectId);
    return res.status(StatusCodes.OK).json(sections);
}

export async function getSection(req: Request, res: Response) {
    const projectId = Number(req.params[RouteParams.ProjectId]);
    const sectId = Number(req.params[RouteParams.SectionId]);
    const user = req.user as IUserAttribute;
    const section = await sectionRepo.getSection(user.id, projectId, sectId);
    return res.status(StatusCodes.OK).json(section);
}

export async function swapSectionOrder(req: Request, res: Response) {
    const projectId = Number(req.params[RouteParams.ProjectId]);
    const sectId = Number(req.params[RouteParams.SectionId]);
    const targetSectId = Number(req.params[RouteParams.TargetSectionId]);
    const user = req.user as IUserAttribute;
    try {
        const sections = await sectionRepo.swapOrder(user.id, projectId, sectId, targetSectId);
        return res.status(StatusCodes.OK).json(sections);
    } catch (e: any) {
        return res.status(StatusCodes.BAD_REQUEST).send({ message: e.message });
    }
}

export async function createSection(req: Request, res: Response) {
    const projectId = req.params[RouteParams.ProjectId];
    const user = req.user as IUserAttribute;
    const json = req.body as Partial<ISectionCreationAttribute>;
    try {
        const sect = await sectionRepo.addSection(user.id, Number(projectId), json.name!);
        return res.status(StatusCodes.CREATED).json(sect);
    } catch (e: any) {
        return res.status(StatusCodes.BAD_REQUEST).send({
            message: e.message
        });
    }
}

export async function updateSection(req: Request, res: Response) {
    const projectId = req.params[RouteParams.ProjectId];
    const sectId = req.params[RouteParams.SectionId];
    const user = req.user as IUserAttribute;
    const json = req.body as Partial<ISectionCreationAttribute>;
    try {
        const sect = await sectionRepo.updateSection(user.id, Number(projectId), Number(sectId), json);
        return res.status(StatusCodes.OK).json(sect);
    } catch (e: any) {
        return res.status(StatusCodes.BAD_REQUEST).send({
            message: e.message
        });
    }
}

export async function deleteSection(req: Request, res: Response) {
    const projectId = req.params[RouteParams.ProjectId];
    const sectId = req.params[RouteParams.SectionId];
    const user = req.user as IUserAttribute;
    try {
        await sectionRepo.deleteSection(user.id, Number(projectId), Number(sectId));
        return res.status(StatusCodes.NO_CONTENT).send();
    } catch (e: any) {
        return res.status(StatusCodes.BAD_REQUEST).send({
            message: e.message
        });
    }
}

export async function duplicateSection(req: Request, res: Response) {
    const projectId = req.params[RouteParams.ProjectId];
    const sectId = req.params[RouteParams.SectionId];
    const user = req.user as IUserAttribute;
    try {
        const sect = await sectionRepo.duplicateSection(user.id, Number(projectId), Number(sectId));
        return res.status(StatusCodes.CREATED).json(sect);
    } catch (e: any) {
        return res.status(StatusCodes.BAD_REQUEST).send({
            message: e.message
        });
    }
}