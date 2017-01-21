import {
  getNextPlayState,
  sequentiallyGetTimerType,
  getPreviousItem,
  getNextItem,
  TIMER_TYPES
} from './utils'
import {changeTimerPlayState, changeTimerType} from './actions'

export default store => e => {
  const shortcut = e.code
  const ctrlKeyIsPressed = e.ctrlKey

  if (shortcut === 'Space') {
    store.dispatch(changeTimerPlayState(getNextPlayState(store)))
    return false
  }

  if (!ctrlKeyIsPressed) {
    return false
  }

  const currentTimerType = store.getState().timer.type

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
