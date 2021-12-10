import { getTaskRepository } from '@daos/repositories';
import { Request, Response } from 'express';

const taskRepo = getTaskRepository();

export async function createTask(req: Request, res: Response) {
    //
}

export async function createSectionTask(req: Request, res: Response) {
    //
}