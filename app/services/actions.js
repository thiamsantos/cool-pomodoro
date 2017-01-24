export const CHANGE_TIMER_TYPE = 'CHANGE_TIMER_TYPE'
export const CHANGE_TIMER_PLAY_STATE = 'CHANGE_TIMER_PLAY_STATE'
export const DECREMENT_TIMER = 'DECREMENT_TIMER'
export const TOGGLE_ADJUST = 'TOGGLE_ADJUST'
export const RESET_TIMER = 'RESET_TIMER'

export const decrementTimer = () => ({
  type: DECREMENT_TIMER
})

export const changeTimerPlayState = state => ({
  type: CHANGE_TIMER_PLAY_STATE,
  payload: {
    state
  }
})

export const changeTimerType = (timerType, value) => ({
  type: CHANGE_TIMER_TYPE,
  payload: {
    value,
    type: timerType
  }
})

export const toggleAdjust = name => ({
  type: TOGGLE_ADJUST,
  payload: {
    name
  }
})

export const resetTimer = value => ({
  type: RESET_TIMER,
  payload: {
    value
  }
})
