import { IProjectAttribute, IProjectCommentCreationAttributes, IProjectCreationAttributes, ViewType } from '@daos/models';
import createServer from '@server';
import { pErr } from '@shared/functions';
import StatusCodes from 'http-status-codes';
import { user1, user2, user3 } from 'spec';
import { ProjectRouteUrlBuilder } from 'src/routes/projects';
import supertest, { SuperTest, Test } from 'supertest';

/* eslint-disable @typescript-eslint/no-non-null-assertion */
const projectRouteBuilder = new ProjectRouteUrlBuilder(false);
describe('ProjectRouter', () => {
    let agent: SuperTest<Test>;

    beforeAll((done) => {
        agent = supertest.agent(createServer(''));
        done();
    });

    const callCreateProjectApi = (auth: string, reqBody: IProjectCreationAttributes) => {
        return agent.put(projectRouteBuilder.create())
            .set('Authorization', auth)
            .type('json').send(reqBody);
    }

    const callGetUserProjectApi = (auth: string) => {
        return agent.get(projectRouteBuilder.getProjects())
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

    const callUpdateProjectApi = (auth: string, id: number, prop: Partial<IProjectCreationAttributes>) => {
        return agent.post(projectRouteBuilder.deleteProject(id))
            .set('Authorization', auth)
            .type('json').send(prop);
    }

    const callSwapProjectOrderApi = (auth: string, id: number, target: number) => {
        return agent.post(projectRouteBuilder.swapProjectOrder(id, target))
            .set('Authorization', auth);
    }

    const callAddFavoriteApi = (auth: string, id: number) => {
        return agent.post(projectRouteBuilder.addFavorite(id))
            .set('Authorization', auth);
    }

    const callRemoveFavoriteApi = (auth: string, id: number) => {
        return agent.post(projectRouteBuilder.removeFavorite(id))
            .set('Authorization', auth);
    }

    const callLeaveProjectApi = (auth: string, id: number) => {
        return agent.post(projectRouteBuilder.leave(id))
            .set('Authorization', auth);
    }

    describe(`"PUT:${projectRouteBuilder.create()}"`, () => {
        const projData: IProjectCreationAttributes = {
            name: 'Test project 1',
            archived: false,
            view: ViewType.List,
            defaultInbox: true
        };

        it(`should return a status code of ${StatusCodes.CREATED} if the project is created successful.`, done => {
            callCreateProjectApi(user1.auth!, projData)
                .end((err: Error, res) => {
                    pErr(err);
                    expect(res.status).toBe(StatusCodes.CREATED);
                    const proj = res.body as IProjectAttribute;
                    expect(proj.id).toBeGreaterThan(0);
                    expect(proj.name).toBe(projData.name);
                    expect(proj.archived).toBe(projData.archived);
                    expect(proj.view).toBe(projData.view);
                    expect(proj.defaultInbox).toBeFalse();
                    done();
                });
        });

        it('should create project with correct order.', done => {
            callCreateProjectApi(user1.auth!, projData)
                .end((err: Error, res) => {
                    const p1 = res.body as IProjectAttribute;
                    const { name, ...newProjData } = projData;
                    callCreateProjectApi(user1.auth!, { name: `above project ${p1.id}`, ...newProjData, aboveProject: p1.id }).end((e1, r1) => {
                        const p2 = r1.body as IProjectAttribute;
                        callCreateProjectApi(user1.auth!, { name: `below project ${p2.id}`, ...newProjData, belowProject: p2.id }).end((e2, r2) => {
                            const p3 = r2.body as IProjectAttribute
                            callGetUserProjectApi(user1.auth!).end((e3, r3) => {
                                const projects = r3.body as IProjectAttribute[];
                                const up1 = projects.find(p => p.id === p1.id);
                                const up2 = projects.find(p => p.id === p2.id);
                                const up3 = projects.find(p => p.id === p3.id);

                                expect(up1!.users![0].props.order).toBeGreaterThan(up2!.users![0].props.order);
                                expect(up3!.users![0].props.order).toBeGreaterThan(up2!.users![0].props.order);
                                done();
                            });
                        });
                    });
                });
        });
    });

    describe(`"GET:${projectRouteBuilder.getProjects()}"`, () => {
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

        it('Each user must have a default Inbox project', done => {
            callGetUserProjectApi(user1.auth!).end((err, res) => {
                const projects = res.body as IProjectAttribute[];
                const inbox = projects.find(p => p.defaultInbox);
                expect(inbox).toBeDefined();
                done();
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
                    expect(res.body).toBeNull();
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

        it(`should return ${StatusCodes.BAD_REQUEST} when trying to delete Inbox project`, done => {
            callGetUserProjectApi(user1.auth!).end((err, res) => {
                const inbox = (res.body as IProjectAttribute[]).find(p => p.defaultInbox);
                callDeleteProjectApi(user1.auth!, inbox!.id).end((err1, res1) => {
                    expect(res1.status).toBe(StatusCodes.BAD_REQUEST);
                    done();
                });
            });
        });

        it(`should return ${StatusCodes.BAD_REQUEST} when it is deleted by user that is not the owner`, (done) => {
            callCreateProjectApi(user2.auth!, {
                name: 'User 2 test project',
                view: ViewType.List,
                archived: false
            }).end((err, res) => {
                const prj = res.body as IProjectAttribute;
                callShareProjectApi(user2.auth!, prj.id, { users: [user1.id] }).end(() => {
                    callDeleteProjectApi(user1.auth!, prj.id).end((err1, res1) => {
                        expect(res1.status).toBe(StatusCodes.BAD_REQUEST);
                        done();
                    });
                });
            });
        });
    });

    const callAddProjectCommentApi = (auth: string, projectId: number, comment: string) => {
        return agent.put(projectRouteBuilder.addProjectComment(projectId))
            .set('Authorization', auth)
            .type('json').send({ comments: comment } as Partial<IProjectCommentCreationAttributes>);
    }

    describe(`"PUT:${projectRouteBuilder.addProjectComment()}"`, () => {
        let project: IProjectAttribute;
        beforeEach(done => {
            callCreateProjectApi(user1.auth!, {
                name: 'Test project',
                archived: false,
                view: ViewType.List
            }).end((err, res) => {
                project = res.body as IProjectAttribute;
                done();
            });
        });

        it(`it should return ${StatusCodes.CREATED} when comment is added succesfully.`, done => {
            callAddProjectCommentApi(user1.auth!, project.id, 'Test comment').end((err, res) => {
                expect(res.status).toBe(StatusCodes.CREATED);
                done();
            });
        });
    });

    describe(`"POST:${projectRouteBuilder.updateProject()}"`, () => {
        let project: IProjectAttribute;
        beforeEach(done => {
            callCreateProjectApi(user1.auth!, {
                name: 'Test project',
                archived: false,
                view: ViewType.List
            }).end((err, res) => {
                project = res.body as IProjectAttribute;
                done();
            });
        });

        it(`it should return ${StatusCodes.OK} when project is updated succesfully.`, done => {
            callUpdateProjectApi(user1.auth!, project.id, { name: 'New test project', archived: true }).end((e, r) => {
                const up = r.body as IProjectAttribute;
                expect(r.status).toBe(StatusCodes.OK);
                expect(up.name).toBe('New test project');
                expect(up.archived).toBeTrue();
                done();
            });
        });

        it(`it should return ${StatusCodes.BAD_REQUEST} when project is updated by non-project collaborator.`, done => {
            callUpdateProjectApi(user2.auth!, project.id, { name: 'New test project', archived: true }).end((e, r) => {
                expect(r.status).toBe(StatusCodes.BAD_REQUEST);
                done();
            });
        });
    });

    describe(`"POST:${projectRouteBuilder.swapProjectOrder()}"`, () => {
        let project: IProjectAttribute;
        let project1: IProjectAttribute;

        beforeEach(done => {
            callCreateProjectApi(user1.auth!, {
                name: 'Test project',
                archived: false,
                view: ViewType.List
            }).end((err, res) => {
                project = res.body as IProjectAttribute;
                callCreateProjectApi(user1.auth!, {
                    name: 'Test project',
                    archived: false,
                    view: ViewType.List
                }).end((e1, r1) => {
                    project1 = r1.body as IProjectAttribute;
                    done();
                });
            });
        });

        it(`it should return ${StatusCodes.OK} when projects order is swapped succesfully.`, done => {
            callSwapProjectOrderApi(user1.auth!, project.id, project1.id).end((e, r) => {
                const projs = r.body as IProjectAttribute[];
                const up = projs.find(p => p.id === project.id);
                const up1 = projs.find(p => p.id === project1.id);
                expect(up?.users![0].props.order).toBe(project1.users![0].props.order);
                expect(up1?.users![0].props.order).toBe(project.users![0].props.order);
                done();
            });
        });
    });

    describe(`"POST:${projectRouteBuilder.addFavorite()}"`, () => {
        let project: IProjectAttribute;
        beforeEach(done => {
            callCreateProjectApi(user1.auth!, {
                name: 'Test project',
                archived: false,
                view: ViewType.List
            }).end((err, res) => {
                project = res.body as IProjectAttribute;
                done();
            });
        });

        it(`it should return ${StatusCodes.NO_CONTENT} when project is added to favorite succesfully.`, done => {
            callAddFavoriteApi(user1.auth!, project.id).end((e, r) => {
                expect(r.status).toBe(StatusCodes.NO_CONTENT);
                done();
            });
        });

        it(`it should return ${StatusCodes.BAD_REQUEST} when trying to mark non-collaborated project.`, done => {
            callAddFavoriteApi(user2.auth!, project.id).end((e, r) => {
                expect(r.status).toBe(StatusCodes.BAD_REQUEST);
                done();
            });
        });
    });

    describe(`"POST:${projectRouteBuilder.removeFavorite()}"`, () => {
        let project: IProjectAttribute;
        beforeEach(done => {
            callCreateProjectApi(user1.auth!, {
                name: 'Test project',
                archived: false,
                view: ViewType.List
            }).end((err, res) => {
                project = res.body as IProjectAttribute;
                done();
            });
        });

        it(`it should return ${StatusCodes.NO_CONTENT} when project is removed off the favorite succesfully.`, done => {
            callRemoveFavoriteApi(user1.auth!, project.id).end((e, r) => {
                expect(r.status).toBe(StatusCodes.NO_CONTENT);
                done();
            });
        });

        it(`it should return ${StatusCodes.BAD_REQUEST} when trying to remove non-collaborated project off the favorite.`, done => {
            callRemoveFavoriteApi(user2.auth!, project.id).end((e, r) => {
                expect(r.status).toBe(StatusCodes.BAD_REQUEST);
                done();
            });
        });
    });

    describe(`"POST:${projectRouteBuilder.leave()}"`, () => {
        let project: IProjectAttribute;
        beforeEach(done => {
            callCreateProjectApi(user1.auth!, {
                name: 'Test project',
                archived: false,
                view: ViewType.List
            }).end((err, res) => {
                project = res.body as IProjectAttribute;
                done();
            });
        });

        it(`it should return ${StatusCodes.NO_CONTENT} when leave project succesfully.`, done => {
            callShareProjectApi(user1.auth!, project.id, { users: [user2.id] }).end((e, r) => {
                callLeaveProjectApi(user1.auth!, project.id).end((e1, r1) => {
                    expect(r1.status).toBe(StatusCodes.NO_CONTENT);
                    done();
                });
            });
        });

        it(`it should return ${StatusCodes.BAD_REQUEST} when trying to leave project without other collaborators`, done => {
            callLeaveProjectApi(user1.auth!, project.id).end((e1, r1) => {
                expect(r1.status).toBe(StatusCodes.BAD_REQUEST);
                done();
            });
        });
    });
});