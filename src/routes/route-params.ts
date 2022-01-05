import { Request } from 'express';

export class RouteParams {
    projectId = 0;
    sectionId = 0;
    taskId = 0;
    targetTaskId = 0;
    labelId = 0;
    commentId = 0;
    targetSectionId = 0;
    targetProjectId = 0;
    targetLabelId = 0;

    constructor(req: Request) {
        const keys = Object.keys(this);
        keys.forEach(k => {
            const kv = req.params[k];
            if (kv) {
                (this as any)[k] = Number(kv);
            } else {
                (this as any)[k] = undefined;
            }
        });
    }
}
