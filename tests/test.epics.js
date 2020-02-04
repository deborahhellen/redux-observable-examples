import "jest";

import { fetchTodosEpic$ } from "../examples/epics";
import { ActionsObservable } from 'redux-observable';
import { of, throwError, interval, BehaviorSubject } from 'rxjs';

// Example unit tests for Epics created using Redux-Observable
 
const TEST_TIMEOUT = 3000;
 
const mockTimer$ = interval(500); // Mock a shorter session refresh interval since the real one is 2 min
 
const mockTodos = [
    {   
        id: 1,
        name: "Buy groceries",
    },
    {
        id: 2,
        name: "Wash car",
    }
];
 
describe("Workspace Epics", () => {
    test("successfully fetches workspace projects for the current workspace", (done) => {
        const mockApi = {
            getTodos: (userId) => of({
                status: 200,
                data: JSON.stringify([ ...mockTodos ]),
            })
        };
        const state$ = new BehaviorSubject({
            user: {
                userId: 1,
                isUserAuthenticated: true,
            }
        });
 
        const action$ = ActionsObservable.of([]);
 
        let actionCount = 0;
        const fetchTodosSubscription = fetchTodosEpic$(action$, state$, { 
            api: mockApi,
            timers: { pollerTimer$: mockTimer$ },
            }).subscribe((action) => {
            expect(action.type).toBe("GET_USER_TODOS_SUCCESS");
            expect(action.projects).toEqual([ ...mockTodos ])
            actionCount++;
        });
 
        setTimeout(() => {
            fetchTodosSubscription.unsubscribe(); // Clean up the subscription so jest can successfully exit
            expect(actionCount).toBeGreaterThanOrEqual(1);
            done();
        }, TEST_TIMEOUT);
    });
 
    test("refreshes the user session if the request results in a 401 error", (done) => {
        const mockApi = {
            getTodos: (userId) => of({
                status: 401,
            })
        };
        const state$ = new BehaviorSubject({
            user: {
                userId: 1,
                isUserAuthenticated: true,
            }
        });
 
        const action$ = ActionsObservable.of([]);
 
        let actionCount = 0;
        const fetchTodosSubscription = fetchTodosEpic$(action$, state$, { 
            api: mockApi,
            timers: { pollerTimer$: mockTimer$ },
            }).subscribe((action) => {
            expect(action.type).toBe("REFRESH_USER_SESSION");
            actionCount++;
        });
 
        setTimeout(() => {
            fetchTodosSubscription.unsubscribe();
            expect(actionCount).toBeGreaterThanOrEqual(1);
            done();
        }, TEST_TIMEOUT);
    });
 
    test("catches a known coded server error", (done) => {
        const mockApi = {
            getWorkspaceProjects: (workspaceId, authToken) => of({
                status: 500,
            })
        };
        const state$ = new BehaviorSubject({
            user: {
                userId: 1,
                isUserAuthenticated: true,
            }
        });
 
        const action$ = ActionsObservable.of([]);
 
        let actionCount = 0;
        const fetchTodosSubscription = fetchTodosEpic$(action$, state$, {
            api: mockApi,
            timers: { pollerTimer$: mockTimer$ },
            }).subscribe((action) => {
            expect(action.type).toBe("GET_USER_TODOS_ERROR");
            expect(action.error.message).toBe("An unexpected error occurred while fetching todos");
            actionCount++;
        });
 
        setTimeout(() => {
            fetchTodosSubscription.unsubscribe();
            expect(actionCount).toBeGreaterThanOrEqual(1);
            done();
        }, TEST_TIMEOUT);
    });
 
    test("catches an unknown network error", (done) => {
        const mockApi = {
            getTodos: (userId) => throwError(new Error("Unknown network error"))
        }
        const state$ = new BehaviorSubject({
            user: {
                userId: 1,
                isUserAuthenticated: true,
            }
        });
 
        const action$ = ActionsObservable.of([]);
 
        let actionCount = 0;
        const fetchTodosSubscription = fetchTodosEpic$(action$, state$, { 
            api: mockApi,
            timers: { pollerTimer$: mockTimer$ },
            }).subscribe((action) => {
            expect(action.type).toBe(WorkspaceActionKeys.getWorkspaceProjectsError);
            expect(action.error.message).toContain("Unknown network error");
            actionCount++;
        });
 
        setTimeout(() => {
            fetchTodosSubscription.unsubscribe();
            expect(actionCount).toBeGreaterThanOrEqual(1);
            done();
        }, TEST_TIMEOUT);
    });
    test("does not attempt to fetch workspace projects if there is no authenticated user", (done) => {
        const state$ = new BehaviorSubject({
            user: {
                userId: 1,
                isUserAuthenticated: false,
            }
        });
 
        const action$ = ActionsObservable.of([]);
 
        let actionCount = 0;
        const fetchTodosSubscription = fetchTodosEpic$(action$, state$, { 
            timers: { pollerTimer$: mockTimer$ },
        }).subscribe((actions) => {
            actionCount++; // Should never get here
        });
 
        setTimeout(() => {
            fetchTodosSubscription.unsubscribe();
            expect(actionCount).toBe(0);
            done();
        }, TEST_TIMEOUT);
 
    });
});
