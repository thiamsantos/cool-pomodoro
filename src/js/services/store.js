import {createStore} from 'redux'

const initialState = {
  timer: 1500,
  timerType: 'code',
  pausedTimer: false,
  notification: false,
  sound: false,
  vibration: false
}

const store = createStore((state = initialState, action) => {
  switch (action.type) {
    case 'DECREMENT_TIMER':
      return {
        ...state,
        timer: (state.timer > 0) ? state.timer - 1 : 0
      }
    case 'CHANGE_TIMER':
      return {
        ...state,
        timer: action.timer,
        pausedTimer: false,
        timerType: action.timerType
      }
    case 'PAUSE_TIMER':
      return {
        ...state,
        pausedTimer: action.pausedTimer
      }
    case 'TOOGLE_NOTIFICATION':
      return {
        ...state,
        notification: !state.notification
      }
    case 'TOOGLE_SOUND':
      return {
        ...state,
        sound: !state.sound
      }
    case 'TOOGLE_VIBRATION':
      return {
        ...state,
        vibration: !state.vibration
      }
    default:
      return state
  }
})

export default store
