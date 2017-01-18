import bel from 'bel'
import {changeTimerPlayState} from '../../services/actions'
import styles from './styles.css'

const isPaused = store => store.getState().timer.playState === 'paused'

const pausedTimer = store => () => {
  const currentPlayState = isPaused(store) ? 'running' : 'paused'
  store.dispatch(changeTimerPlayState(currentPlayState))
}

export default store => {
  const pausedState = isPaused(store) ? styles.play : styles.pause

  return bel`<button
    class="${styles.button} ${pausedState}"
    onclick=${pausedTimer(store)}>
    ${pausedState}
  </button>`
}
