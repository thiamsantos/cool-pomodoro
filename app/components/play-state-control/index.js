import bel from 'bel'
import {changeTimerPlayState} from '../../services/actions'
import styles from './styles.css'

export const isPaused = store => store.getState().timer.playState === 'paused'

export const getNextPlayState = store =>
  isPaused(store) ? 'running' : 'paused'

export const getPlayStateStyle = (store, styles) =>
  isPaused(store) ? styles.play : styles.pause

export const handleClick = store => () => {
  store.dispatch(changeTimerPlayState(getNextPlayState(store)))
}

export const getText = store =>
  isPaused(store) ? 'play' : 'pause'

export default store =>
  bel`<button
    class="${styles.button} ${getPlayStateStyle(store, styles)}"
    onclick=${handleClick(store)}>
    ${getText(store)}
  </button>`
