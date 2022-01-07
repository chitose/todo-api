/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ILabelAttribute, ILabelCreationAttribute } from '@daos/models';
import createServer from '@server';
import { StatusCodes } from 'http-status-codes';
import { user1 } from 'spec';
import { LabelRouteUrlBuilder } from 'src/routes/label';
import supertest, { SuperTest, Test } from 'supertest';

const labelUrlBuilder = new LabelRouteUrlBuilder(false);

describe('LabelRouter', () => {
    let agent: SuperTest<Test>;

    beforeAll((done) => {
        agent = supertest.agent(createServer(''));
        done();
        // prepare test data        
    });

    const callCreateLabelApi = (auth: string, prop: ILabelCreationAttribute) => {
        return agent.put(labelUrlBuilder.createLabel())
            .set('Authorization', auth).type('json').send(prop);
    }

    const callGetLabelsApi = (auth: string) => {
        return agent.get(labelUrlBuilder.getLabels())
            .set('Authorization', auth);
    }

    const callRenameLabelApi = (auth: string, id: number, name: string) => {
        return agent.post(labelUrlBuilder.rename(id))
            .set('Authorization', auth).type('json').send({ title: name } as ILabelCreationAttribute);
    }

    const callSwapLabelOrderApi = (auth: string, id: number, targetId: number) => {
        return agent.post(labelUrlBuilder.swapOrder(id, targetId))
            .set('Authorization', auth);
    }

    const callDeleteLabelApi = (auth: string, id: number) => {
        return agent.delete(labelUrlBuilder.delete(id)).
            set('Authorization', auth);
    }

    const callSearchLabelsApi = (auth: string, query: string) => {
        return agent.get(labelUrlBuilder.search(query)).
            set('Authorization', auth);
    }

    it(`should return status ${StatusCodes.CREATED} when label is created successfully`, done => {
        callCreateLabelApi(user1.auth!, { title: 'Test label' }).end((e, r) => {
            expect(r.status).toBe(StatusCodes.CREATED);
            const lbl = r.body as ILabelAttribute;

            callCreateLabelApi(user1.auth!, { title: `Test label above ${lbl.id}`, aboveLabel: lbl.id }).end((e1, r1) => {
                const lbl1 = r1.body as ILabelAttribute;
                expect(lbl1.order).toBeLessThan(lbl.order);

                callCreateLabelApi(user1.auth!, { title: `Test label below ${lbl1.id}`, belowLabel: lbl1.id }).end((e1, r2) => {
                    const lbl2 = r2.body as ILabelAttribute;
                    expect(lbl2.order).toBeGreaterThan(lbl1.order);
                    done();
                });
            });
        });
    });

    it('should return lists of labels created by user', done => {
        callCreateLabelApi(user1.auth!, { title: 'Test label' }).end((e, r) => {
            const lbl = r.body as ILabelAttribute;
            callGetLabelsApi(user1.auth!).end((e1, r1) => {
                const lbls = r1.body as ILabelAttribute[];
                expect(lbls.find(l => l.id === lbl.id)).toBeDefined();
                done();
            });
        });
    });

    it(`should return status code ${StatusCodes.OK} when label is renamed`, done => {
        callCreateLabelApi(user1.auth!, { title: 'Test label' }).end((e, r) => {
            const lbl = r.body as ILabelAttribute;
            callRenameLabelApi(user1.auth!, lbl.id, 'Updated title').end((e1, r1) => {
                const ul = r1.body as ILabelAttribute;
                expect(ul.id).toBe(lbl.id);
                expect(ul.title).toBe('Updated title');
                done();
            });
        });
    });

    it(`should return status code ${StatusCodes.NO_CONTENT} when label is deleted`, done => {
        callCreateLabelApi(user1.auth!, { title: 'Test label' }).end((e, r) => {
            const lbl = r.body as ILabelAttribute;
            callDeleteLabelApi(user1.auth!, lbl.id).end((e1, r1) => {
                expect(r1.status).toBe(StatusCodes.NO_CONTENT);
                done();
            });
        });
    });

    it('should swap the labels order', done => {
        callCreateLabelApi(user1.auth!, { title: 'Test label' }).end((e, r) => {
            const lbl = r.body as ILabelAttribute;
            callCreateLabelApi(user1.auth!, { title: 'Test label' }).end((e1, r2) => {
                const lbl1 = r2.body as ILabelAttribute;
                expect(lbl.order == lbl1.order).toBeFalse();
                callSwapLabelOrderApi(user1.auth!, lbl.id, lbl1.id).end((e2, r2) => {
                    const lbls = r2.body as ILabelAttribute[];
                    const ulbl = lbls.find(l => l.id === lbl.id);
                    const ulbl1 = lbls.find(l => l.id === lbl1.id);
                    expect(ulbl?.order).toBe(lbl1.order);
                    expect(ulbl1?.order).toBe(lbl.order);
                    done();
                });
            });
        });
    });

    it('should return labels containing the search text', done => {
        callCreateLabelApi(user1.auth!, { title: 'Test label one' }).end((e, r) => {
            callCreateLabelApi(user1.auth!, { title: 'Test label two' }).end((e1, r2) => {
                callSearchLabelsApi(user1.auth!, 'two').end((e2, r2) => {
                    const lbls = r2.body as ILabelAttribute[];
                    expect(lbls.length).toBe(1);
                    done();
                });
            });
        });
    });
});