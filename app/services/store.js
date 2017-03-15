import {createStore, combineReducers} from 'redux'
import {loadState} from './local-storage'
import * as reducers from './reducers'

export const timerInitialState = {
  value: 1500,
  type: 'code',
  playState: 'running'
}

export const adjustsInitialState = {
  notification: false,
  sound: false,
  vibration: false
}

let localStorage
if (typeof window === 'undefined') {
  localStorage = {}
} else {
  localStorage = window.localStorage
}

export default createStore(
  combineReducers(reducers),
  {
    timer: timerInitialState,
    adjusts: loadState(localStorage).adjusts || adjustsInitialState
  }
)
