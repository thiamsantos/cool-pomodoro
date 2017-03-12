import {
  DECREMENT_TIMER,
  CHANGE_TIMER_TYPE,
  CHANGE_TIMER_PLAY_STATE,
  TOGGLE_ADJUST,
  RESET_TIMER
} from './actions'

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

export const timer = (state = timerInitialState, action) => {
  switch (action.type) {
    case DECREMENT_TIMER:
      return {
        ...state,
        value: (state.value > 0) ? state.value - 1 : 0
      }
    case CHANGE_TIMER_PLAY_STATE:
      return {
        ...state,
        playState: action.payload.state
      }
    case CHANGE_TIMER_TYPE:
      return {
        playState: 'running',
        type: action.payload.type,
        value: action.payload.value
      }
    case RESET_TIMER:
      return {
        playState: 'paused',
        type: state.type,
        value: action.payload.value
      }
    default:
      return state
  }
}

export const adjusts = (state = adjustsInitialState, action) => {
  switch (action.type) {
    case TOGGLE_ADJUST:
      return ({
        ...state,
        [action.payload.name]: !state[action.payload.name]
      })
    default:
      return state
  }
}
