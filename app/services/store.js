import {createStore, combineReducers, applyMiddleware} from 'redux'
import createLogger from 'redux-logger'
import * as reducers from './reducers'

const logger = createLogger()

export default createStore(combineReducers(reducers), applyMiddleware(logger))
