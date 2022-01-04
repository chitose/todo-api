/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
    IProjectAttribute,
    IProjectCommentCreationAttributes,
    IProjectCreationAttributes,
    ITaskAttribute,
    ITaskCommentCreationAttribute,
    ITaskCreationAttributes,
    ViewType,
} from '@daos/models';
import { ISearchResult } from '@daos/repositories/search-repo';
import createServer from '@server';
import moment from 'moment';
import { user1 } from 'spec';
import { ProjectRouteUrlBuilder } from 'src/routes/projects';
import { ViewRouteUrlBuilder } from 'src/routes/view';
import supertest, { SuperTest, Test } from 'supertest';

const viewUrlBuilder = new ViewRouteUrlBuilder(false);
const projectRouteBuilder = new ProjectRouteUrlBuilder(false);

describe('ViewRouter', () => {
    let agent: SuperTest<Test>;
    let project: IProjectAttribute;

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

    const callAddTaskCommentApi = (auth: string, projectId: number, taskId: number, comment: string) => {
        return agent.put(projectRouteBuilder.addTaskComment(projectId, taskId))
            .set('Authorization', auth)
            .type('json').send({ comments: comment } as Partial<ITaskCommentCreationAttribute>);
    }

    const callAddProjectCommentApi = (auth: string, projectId: number, comment: string) => {
        return agent.put(projectRouteBuilder.addProjectComment(projectId))
            .set('Authorization', auth)
            .type('json').send({ comments: comment } as Partial<IProjectCommentCreationAttributes>);
    }

    const callSearchApi = (auth: string, query: string) => {
        return agent.get(viewUrlBuilder.search(query))
            .set('Authorization', auth);
    }

    const callTodayTasksApi = (auth: string) => {
        return agent.get(viewUrlBuilder.today()).set('Authorization', auth);
    }

    const callUpcommingTasksApi = (auth: string) => {
        return agent.get(viewUrlBuilder.upcomming()).set('Authorization', auth);
    }

    const callTasksByLabelApi = (auth: string, labelId: number) => {
        return agent.get(viewUrlBuilder.tasksByLabel(labelId)).set('Authorization', auth);
    }

    beforeAll((done) => {
        agent = supertest.agent(createServer(''));
        // prepare test data

        callCreateProjectApi(user1.auth!, { name: 'Test project one', view: ViewType.List, archived: false }).end((e, r) => {
            project = r.body as IProjectAttribute;

            callAddProjectCommentApi(user1.auth!, project.id, 'Test project comment one').end(() => {
                callAddProjectTaskApi(user1.auth!, project.id, {
                    title: 'Task one',
                    description: 'Task one',
                    labels: [{ id: 1 }, { id: 2 }],
                    projectId: project.id,
                    dueDate: moment().add(-1, 'days').toDate()
                }).end((e1, r1) => {
                    callAddTaskCommentApi(user1.auth!, project.id, (r1.body as ITaskAttribute).id, 'Test comment one').end(() => {
                        callAddProjectTaskApi(user1.auth!, project.id, {
                            title: 'Task two',
                            description: 'Task two',
                            labels: [{ id: 2 }, { id: 3 }],
                            projectId: project.id,
                            dueDate: moment().add(1, 'days').toDate()
                        }).end((e2, r2) => {
                            callAddTaskCommentApi(user1.auth!, project.id, (r2.body as ITaskAttribute).id, 'Test comment two').end(() => {
                                done();
                            });
                        });
                    });
                });
            });
        });
    });

    it('should found matched project, task and comment when doing search', done => {
        callSearchApi(user1.auth!, 'one').end((e, r) => {
            const results = r.body as ISearchResult[];
            const proj = results.find(p => p.project && p.project.name.indexOf('one') > 0);
            const task = results.find(t => t.task && t.task.title.indexOf('one') > 0);
            const cmt = results.find(c => c.comment && c.comment.comments.indexOf('one') > 0);
            expect(proj).toBeDefined();
            expect(task).toBeDefined();
            expect(cmt).toBeDefined();
            done();
        });
    });

    it('should return overdued tasks and task due today', done => {
        callAddProjectTaskApi(user1.auth!, project.id, {
            title: 'Task due today',
            dueDate: moment().toDate(),
            projectId: project.id,
            description: 'Task due today'
        }).end((e, r) => {
            callTodayTasksApi(user1.auth!).end((e1, r1) => {
                const tasks = r1.body as ITaskAttribute[];
                expect(tasks.every(t => t.dueDate)).toBeTrue();
                const overdueTask = tasks.find(t => moment(t.dueDate).isBefore(moment()));
                const todayTask = tasks.find(t => moment(t.dueDate).isSame(moment(), 'day'));
                const upcommingTask = tasks.find(t => moment(t.dueDate).isAfter(moment()));
                expect(overdueTask).toBeDefined();
                expect(todayTask).toBeDefined();
                expect(upcommingTask).toBeUndefined();
                done();
            });
        });
    });

    it('should return overdued tasks and upcomming tasks', done => {
        callAddProjectTaskApi(user1.auth!, project.id, {
            title: 'Task due today',
            dueDate: moment().toDate(),
            projectId: project.id,
            description: 'Task due today'
        }).end((e, r) => {
            callUpcommingTasksApi(user1.auth!).end((e1, r1) => {
                const tasks = r1.body as ITaskAttribute[];
                expect(tasks.every(t => t.dueDate)).toBeTrue();
                const overdueTask = tasks.find(t => moment(t.dueDate).isBefore(moment()));
                const todayTask = tasks.find(t => moment(t.dueDate).isSame(moment(), 'day'));
                const upcommingTask = tasks.find(t => moment(t.dueDate).isAfter(moment()));
                expect(overdueTask).toBeDefined();
                expect(todayTask).toBeUndefined();
                expect(upcommingTask).toBeDefined();
                done();
            });
        });
    });

    it('should return tasks tagged by label', done => {
        callTasksByLabelApi(user1.auth!, 1).end((e1, r1) => {
            const tasks = r1.body as ITaskAttribute[];
            expect(tasks.length).toBe(1);
            done();
        });
    });
});