import { Action } from 'redux';
import { ActionsObservable, StateObservable, ofType } from 'redux-observable';
import { map, switchMap, filter, catchError, withLatestFrom, takeUntil } from "rxjs/operators";
import { of } from 'rxjs';

import { DependenciesContainer } from '../AppDependencies';
import { AppState } from '../AppState';

// Example poller that starts on app spin-up and polls the api periodically for a list of  "todos" 

// Assume pollerTimer$ is defined in our dependencies as interval(1000)
 
export const fetchTodosEpic$ = (action$: ActionsObservable<Action<any>>,
                                state$: StateObservable<AppState>,
                                { api, timers: { pollerTimer$ } }: DependenciesContainer) =>
    pollerTimer$.pipe(
        withLatestFrom(state$),
        filter(([action, state]) => state.user.isUserAuthenticated),
        switchMap(([action, state]) => 
            // Issue a simple api request with values from state as parameters
            api.getTodos(state.user.id).pipe(
                map((response) => {
                    switch(response.status) {
                        // Handling basic success case
                        case 200: 
                            return {
                                type: "GET_USER_TODOS_SUCCESS",
                                todos: JSON.parse(response.data), 
                            };
                        // Handling expected status codes
                        // (Eg. the user's session has expired and we need to re-authenticate)
                        case 401:
                            return {
                                type: "REFRESH_USER_SESSION",
                            };
                        // Using the default case to handle all other req status codes
                        default:
                            return { 
                                type: "GET_USER_TODOS_ERROR",
                                error: new Error("An unexpected error occurred while fetching todos"),
                            };
                        };
                    }),
            )
        ),
        // Catch any unexpected errors caught during the api request (usually but not exclusively JS errors)
        catchError((error: Error) => of({ 
            type: "GET_USER_TODOS_ERROR",
            error,
        })),
        // We can also stop the poller if an action of type STOP_POLLER is dispatched
        takeUntil(action$.pipe(ofType("STOP_POLLER"))), 
    );
