import {createStore, combineReducers} from 'redux'
import * as reducers from './reducers'

export default createStore(combineReducers(reducers))
