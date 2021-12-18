/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { IProjectAttribute, IProjectCreationAttributes, ViewType } from '@daos/models';
import app from '@server';
import { pErr } from '@shared/functions';
import StatusCodes from 'http-status-codes';
import { user1, user2, user3 } from 'spec';
import { ProjectRouteUrlBuilder } from 'src/routes/projects';
import supertest, { SuperTest, Test } from 'supertest';

const projectRouteBuilder = new ProjectRouteUrlBuilder(false);
describe('ProjectRouter', () => {
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

    const callGetUserProjectApi = (auth: string) => {
        return agent.get(projectRouteBuilder.getUserProjects())
            .set('Authorization', auth);
    }

    const callGetProjectApi = (auth: string, id: number) => {
        return agent.get(projectRouteBuilder.getProjectById(id))
            .set('Authorization', auth);
    }

    const callShareProjectApi = (auth: string, id: number, req: { users: string[] }) => {
        return agent.post(projectRouteBuilder.shareProject(id))
            .set('Authorization', auth)
            .send(req);
    }

    const callDeleteProjectApi = (auth: string, id: number) => {
        return agent.delete(projectRouteBuilder.deleteProject(id))
            .set('Authorization', auth);
    }

    describe(`"PUT:${projectRouteBuilder.create()}"`, () => {
        const projData: IProjectCreationAttributes = {
            name: 'Test project 1',
            archived: false,
            view: ViewType.List
        };

        it(`should return a status code of ${StatusCodes.CREATED} if the request was successful.`, done => {
            callCreateProjectApi(user1.auth!, projData)
                .end((err: Error, res) => {
                    pErr(err);
                    expect(res.status).toBe(StatusCodes.CREATED);
                    const proj = res.body as IProjectAttribute;
                    expect(proj.id).toBeGreaterThan(0);
                    expect(proj.name).toBe(projData.name);
                    expect(proj.archived).toBe(projData.archived);
                    expect(proj.view).toBe(projData.view);
                    done();
                });
        });
    });

    describe(`"GET:${projectRouteBuilder.getUserProjects()}"`, () => {
        it('return projects where user is a collaborator', (done) => {
            // prepare some data
            callCreateProjectApi(user2.auth!, {
                name: 'User 2 Test Project',
                archived: false,
                view: ViewType.List
            }).end(() => {
                callCreateProjectApi(user3.auth!, {
                    name: 'User 3 Test Project',
                    archived: false,
                    view: ViewType.List
                }).end(() => {
                    callGetUserProjectApi(user2.auth!).end((err, res) => {
                        pErr(err);
                        expect(res.status).toBe(StatusCodes.OK);
                        const projs = res.body as IProjectAttribute[];
                        expect(projs.length).toBeGreaterThan(0);
                        expect(projs.some(p => p.name === 'User 2 Test Project')).toBeTrue();
                        expect(projs.every(p => p.name !== 'User 3 Test Project')).toBeTrue();
                        done();
                    });
                });
            });
        });
    });

    describe(`"GET:${projectRouteBuilder.getProjectById()}"`, () => {
        it('should return project by id', (done) => {
            callCreateProjectApi(user1.auth!, {
                name: 'User 1 Test Project',
                archived: false,
                view: ViewType.List
            }).end((err, res) => {
                const proj = res.body as IProjectAttribute;
                expect(proj.id).toBeGreaterThan(0);
                callGetProjectApi(user1.auth!, proj.id).end((err1, res1) => {
                    expect(res1.status).toBe(StatusCodes.OK);
                    const proj1 = res1.body as IProjectAttribute;
                    expect(proj1.id).toBe(proj.id);
                    done();
                });
            });
        });

        it('should return null when request by user that is not a collaborator', (done) => {
            callCreateProjectApi(user1.auth!, {
                name: 'User 1 Test Project',
                archived: false,
                view: ViewType.List
            }).end((err, res) => {
                const proj = res.body as IProjectAttribute;
                expect(proj.id).toBeGreaterThan(0);
                callGetProjectApi(user2.auth!, proj.id).end((err, res) => {
                    expect(res.body).toBe('');
                    done();
                });
            });
        });

    });

    describe(`"POST:${projectRouteBuilder.shareProject()}"`, () => {
        it('should share project with other user', (done) => {
            callCreateProjectApi(user1.auth!, {
                name: 'User 1 Test Project',
                archived: false,
                view: ViewType.List
            }).end((err, res) => {
                const proj = res.body as IProjectAttribute;
                callShareProjectApi(user1.auth!, proj.id, { users: [user2.id, user3.id] }).end((err1, res1) => {
                    expect(res1.status).toBe(StatusCodes.OK);
                    callGetProjectApi(user2.auth!, proj.id).end((_, r) => {
                        const proj1 = r.body as IProjectAttribute;
                        expect(proj1.id).toBe(proj.id);
                        done();
                    });
                });
            });
        });

        it('should not share project where user is not a collaborator', (done) => {
            callCreateProjectApi(user2.auth!, {
                name: 'User 2 Test Project',
                archived: false,
                view: ViewType.List
            }).end((err, res) => {
                pErr(err);
                const proj = res.body as IProjectAttribute;
                callShareProjectApi(user1.auth!, proj.id, { users: [user3.id] }).end((err1, res1) => {
                    expect(res1.status).toBe(StatusCodes.BAD_REQUEST);
                    done();
                });
            });
        });
    });

    describe(`"DELETE:${projectRouteBuilder.deleteProject()}"`, () => {
        it(`should return ${StatusCodes.NO_CONTENT} when it is deleted sucessfully.`, (done) => {
            callCreateProjectApi(user2.auth!, {
                name: 'User 2 test project',
                view: ViewType.List,
                archived: false
            }).end((err, res) => {
                const prj = res.body as IProjectAttribute;
                callDeleteProjectApi(user2.auth!, prj.id).end((err1, res1) => {
                    expect(res1.status).toBe(StatusCodes.NO_CONTENT);
                    done();
                });
            });
        });

        it(`should return ${StatusCodes.BAD_REQUEST} when it is deleted by user that is not a collaborator`, (done) => {
            callCreateProjectApi(user2.auth!, {
                name: 'User 2 test project',
                view: ViewType.List,
                archived: false
            }).end((err, res) => {
                const prj = res.body as IProjectAttribute;
                callDeleteProjectApi(user1.auth!, prj.id).end((err1, res1) => {
                    expect(res1.status).toBe(StatusCodes.BAD_REQUEST);
                    done();
                });
            });
        });
    });
});