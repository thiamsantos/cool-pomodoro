import bel from 'bel'
import {changeTimerPlayState} from '../services/actions'

const isPaused = store => store.getState().timer.playState === 'paused'

const pausedTimer = store => () => {
  const currentPlayState = isPaused(store) ? 'running' : 'paused'
  store.dispatch(changeTimerPlayState(currentPlayState))
}

export default store => {
  const pausedState = isPaused(store) ? 'play' : 'pause'

  return bel`<button
    class="control-button control-button--${pausedState}"
    onclick=${pausedTimer(store)}>
    ${pausedState}
  </button>`
}
