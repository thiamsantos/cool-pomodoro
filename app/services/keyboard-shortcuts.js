import {
  getNextPlayState,
  sequentiallyGetTimerType,
  getPreviousItem,
  getNextItem,
  TIMER_TYPES
} from './utils'
import {changeTimerPlayState, changeTimerType} from './actions'

export default store => e => {
  const state = store.getState()
  const shortcut = e.code
  const ctrlKeyIsPressed = e.ctrlKey

  if (shortcut === 'Space') {
    store.dispatch(changeTimerPlayState(getNextPlayState(state)))
    return false
  }

  if (!ctrlKeyIsPressed) {
    return false
  }

  const currentTimerType = state.timer.type

  if (shortcut === 'ArrowLeft') {
    const {type, value} = sequentiallyGetTimerType(
      currentTimerType,
      TIMER_TYPES,
      getPreviousItem
    )
    store.dispatch(changeTimerType(type, value))
    return false
  }

  if (shortcut === 'ArrowRight') {
    const {type, value} = sequentiallyGetTimerType(
      currentTimerType,
      TIMER_TYPES,
      getNextItem
    )
    store.dispatch(changeTimerType(type, value))
    return false
  }
}
