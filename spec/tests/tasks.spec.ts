/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
    IProjectAttribute,
    IProjectCreationAttributes,
    ITaskAttribute,
    ITaskCreationAttributes,
    TaskPriority,
    ViewType,
} from '@daos/models';
import { ISectionAttribute, ISectionCreationAttribute } from '@daos/models/section';
import app from '@server';
import { pErr } from '@shared/functions';
import StatusCodes from 'http-status-codes';
import { user1, user2 } from 'spec';
import { ProjectRouteUrlBuilder } from 'src/routes/projects';
import supertest, { SuperTest, Test } from 'supertest';

const projectRouteBuilder = new ProjectRouteUrlBuilder(false);
describe('ProjectRouter - Tasks', () => {
    let agent: SuperTest<Test>;

    beforeAll((done) => {
        agent = supertest.agent(app);
        done();
    });

    const callCreateProjectApi = (auth: string, reqBody: IProjectCreationAttributes) => {
        return agent.put(projectRouteBuilder.create())
            .set('Authorization', auth)
            .type('json').send(reqBody);
    }

    const callAddProjectTaskApi = (auth: string, projectId: number, taskProps: ITaskCreationAttributes) => {
        return agent.put(projectRouteBuilder.createTask(projectId))
            .set('Authorization', auth)
            .type('json').send(taskProps);
    }

    const callAddSectionApi = (auth: string, projectId: number, name: string) => {
        return agent.put(projectRouteBuilder.createSection(projectId))
            .set('Authorization', auth)
            .type('json').send({ name: name } as ISectionCreationAttribute);
    }

    const callGetTasksApi = (auth: string, projectId: number) => {
        return agent.get(projectRouteBuilder.getTasks(projectId))
            .set('Authorization', auth);
    }

    const callGetTaskApi = (auth: string, projectId: number, taskId: number) => {
        return agent.get(projectRouteBuilder.getTask(projectId, taskId))
            .set('Authorization', auth);
    }

    describe(`"PUT:${projectRouteBuilder.createTask()}"`, () => {
        let project: IProjectAttribute;
        let section: ISectionAttribute;
        beforeEach(done => {
            callCreateProjectApi(user1.auth!, {
                name: 'Test project with section',
                archived: false,
                view: ViewType.List
            }).end((err, res) => {
                pErr(err);
                project = res.body as IProjectAttribute;
                callAddSectionApi(user1.auth!, project.id, 'Test Section').end((err1, res1) => {
                    section = res1.body as ISectionAttribute;
                    done();
                });
            });
        });

        it(`should return status code ${StatusCodes.CREATED} when project task is added successfully.`, done => {
            callAddProjectTaskApi(user1.auth!, project.id, {
                title: 'Test task',
                description: 'Test desc',
                projectId: project.id,
                completed: false
            }).end((err, res) => {
                const t = res.body as ITaskAttribute;
                expect(res.status).toBe(StatusCodes.CREATED);
                expect(t.id).toBeGreaterThan(0);
                expect(t.taskOrder).toBeGreaterThan(0);
                done();
            });
        });

        it('taskOrder should increase by one a project task is added successfully.', done => {
            callAddProjectTaskApi(user1.auth!, project.id, {
                title: 'Test task',
                description: 'Test desc',
                projectId: project.id,
                completed: false
            }).end((err, res) => {
                const t = res.body as ITaskAttribute;
                callAddProjectTaskApi(user1.auth!, project.id, {
                    title: 'Test task 1',
                    description: 'Test desc 1',
                    projectId: project.id,
                    completed: false
                }).end((err1, res1) => {
                    const task1 = res1.body as ITaskAttribute;
                    expect(task1.taskOrder).toBe(t.taskOrder + 1);
                });

                done();
            });
        });

        it(`should return status code ${StatusCodes.CREATED} when section task is added successfully.`, done => {
            callAddProjectTaskApi(user1.auth!, project.id, {
                title: 'Test task for section',
                description: 'Test desc',
                projectId: project.id,
                sectionId: section.id,
                completed: false
            }).end((err, res) => {
                const t = res.body as ITaskAttribute;
                expect(res.status).toBe(StatusCodes.CREATED);
                expect(t.id).toBeGreaterThan(0);
                expect(t.taskOrder).toBeGreaterThan(0);
                done();
            });
        });
    });

    describe(`"GET:${projectRouteBuilder.getTasks()}"`, () => {
        let project: IProjectAttribute;
        let section: ISectionAttribute;
        beforeEach(done => {
            callCreateProjectApi(user1.auth!, {
                name: 'Test project with section',
                archived: false,
                view: ViewType.List
            }).end((err, res) => {
                pErr(err);
                project = res.body as IProjectAttribute;
                callAddSectionApi(user1.auth!, project.id, 'Test Section').end((err1, res1) => {
                    section = res1.body as ISectionAttribute;
                    done();
                });
            });
        });

        it('should return tasks when user is the probject collaborator', done => {
            callAddProjectTaskApi(user1.auth!, project.id, {
                title: 'Test task',
                description: 'Test desc',
                projectId: project.id,
                completed: false
            }).end((err, res) => {
                const task = res.body as ITaskAttribute;
                callGetTaskApi(user1.auth!, project.id, Number(task.id)).end((err1, res1) => {
                    const task1 = res1.body as ITaskAttribute;
                    expect(task1.id).toBe(task.id);
                    done();
                });
            });
        });

        it('should return no tasks when user is not the probject collaborator', done => {
            callAddProjectTaskApi(user1.auth!, project.id, {
                title: 'Test task',
                description: 'Test desc',
                projectId: project.id,
                completed: false
            }).end((err, res) => {
                callGetTasksApi(user2.auth!, project.id).end((err1, res1) => {
                    const tasks = res1.body as ITaskAttribute[];
                    expect(tasks.length).toBe(0);
                    done();
                });
            });
        });
    });

    describe(`"GET:${projectRouteBuilder.getTask()}"`, () => {
        let project: IProjectAttribute;
        let section: ISectionAttribute;
        beforeEach(done => {
            callCreateProjectApi(user1.auth!, {
                name: 'Test project with section',
                archived: false,
                view: ViewType.List
            }).end((err, res) => {
                pErr(err);
                project = res.body as IProjectAttribute;
                callAddSectionApi(user1.auth!, project.id, 'Test Section').end((err1, res1) => {
                    section = res1.body as ISectionAttribute;
                    done();
                });
            });
        });

        it(`should return status ${StatusCodes.OK} if user is the project collaborator of the task`, done => {
            callAddProjectTaskApi(user1.auth!, project.id, {
                title: 'Test task',
                description: 'Test desc',
                projectId: project.id,
                completed: false
            }).end((err, res) => {
                callGetTasksApi(user1.auth!, project.id).end((err1, res1) => {
                    const tasks = res1.body as ITaskAttribute[];
                    expect(tasks.length).toBeGreaterThan(0);
                    done();
                });
            });
        });

        it('should return no task when user is not the probject collaborator', done => {
            callAddProjectTaskApi(user1.auth!, project.id, {
                title: 'Test task',
                description: 'Test desc',
                projectId: project.id,
                completed: false
            }).end((err, res) => {
                const task = res.body as ITaskAttribute;
                callGetTaskApi(user2.auth!, task.projectId, task.id).end((err1, res1) => {
                    expect(res1.body).toBe('');
                    done();
                });
            });
        });
    });

    const callDuplicateTaskApi = (auth: string, projectId: number, taskId: number) => {
        return agent.post(projectRouteBuilder.duplicateTask(projectId, taskId))
            .set('Authorization', auth);
    }

    describe(`"POST:${projectRouteBuilder.duplicateTask()}"`, () => {
        let project: IProjectAttribute;
        let section: ISectionAttribute;
        let task: ITaskAttribute;
        beforeEach(done => {
            callCreateProjectApi(user1.auth!, {
                name: 'Test project with section',
                archived: false,
                view: ViewType.List
            }).end((err, res) => {
                pErr(err);
                project = res.body as IProjectAttribute;
                callAddSectionApi(user1.auth!, project.id, 'Test Section').end((err1, res1) => {
                    section = res1.body as ISectionAttribute;
                    callAddProjectTaskApi(user1.auth!, project.id, {
                        title: 'Test task',
                        description: 'Test desc',
                        projectId: project.id,
                        completed: false
                    }).end((err2, res2) => {
                        task = res2.body as ITaskAttribute;
                        done();
                    });
                });
            });
        });

        it(`should return status ${StatusCodes.CREATED} when task is duplicated successfully.`, done => {
            callDuplicateTaskApi(user1.auth!, project.id, task.id).end((err, res) => {
                expect(res.status).toBe(StatusCodes.CREATED);
                done();
            });
        });

        it(`should return status ${StatusCodes.BAD_REQUEST} when duplicate not-viewable task`, done => {
            callDuplicateTaskApi(user2.auth!, project.id, task.id).end((err, res) => {
                expect(res.status).toBe(StatusCodes.BAD_REQUEST);
                done();
            });
        });
    });

    const callUpdateTaskApi = (auth: string, projectId: number, taskId: number, taskProp: Partial<ITaskCreationAttributes>) => {
        return agent.post(projectRouteBuilder.updateTask(projectId, taskId))
            .set('Authorization', auth).type('json').send(taskProp);
    }

    describe(`POST:"${projectRouteBuilder.updateTask()}"`, () => {
        let project: IProjectAttribute;
        let section: ISectionAttribute;
        let task: ITaskAttribute;
        beforeEach(done => {
            callCreateProjectApi(user1.auth!, {
                name: 'Test project with section',
                archived: false,
                view: ViewType.List
            }).end((err, res) => {
                pErr(err);
                project = res.body as IProjectAttribute;
                callAddSectionApi(user1.auth!, project.id, 'Test Section').end((err1, res1) => {
                    section = res1.body as ISectionAttribute;
                    callAddProjectTaskApi(user1.auth!, project.id, {
                        title: 'Test task',
                        description: 'Test desc',
                        projectId: project.id,
                        completed: false
                    }).end((err2, res2) => {
                        task = res2.body as ITaskAttribute;
                        done();
                    });
                });
            });
        });

        const updateProp: Partial<ITaskCreationAttributes> = {
            title: 'Updated test task',
            description: 'Updated test task description',
            completed: true,
            dueDate: new Date(),
            priority: TaskPriority.Priority2,
            assignTo: user2.id
        };

        it(`it should return status ${StatusCodes.OK} when task is updated successfully`, done => {            
            callUpdateTaskApi(user1.auth!, project.id, task.id, updateProp).end((err, res) => {
                expect(res.status).toBe(StatusCodes.OK);
                const utask = res.body as ITaskAttribute;
                expect(utask.priority).toBe(updateProp.priority);
                expect(utask.title).toBe(updateProp.title!);
                expect(utask.description).toBe(updateProp.description!);
                expect(utask.assignTo).toBe(updateProp.assignTo);
                expect(new Date(utask.dueDate!.toString())).toEqual(updateProp.dueDate!);
                done();
            });
        });

        it(`it should return status ${StatusCodes.BAD_REQUEST} when task is updated by non project collaborator`, done => {            
            callUpdateTaskApi(user2.auth!, project.id, task.id, updateProp).end((err, res) => {
                expect(res.status).toBe(StatusCodes.BAD_REQUEST);                
                done();
            });
        });

    });
});