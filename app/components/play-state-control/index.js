import bel from 'bel'
import {changeTimerPlayState} from '../../services/actions'
import {
  getNextPlayState,
  getPlayStateStyle,
  getNextPlayStateText
} from '../../services/utils'
import styles from './styles.css'

export const handleClick = store => e => {
  store.dispatch(changeTimerPlayState(getNextPlayState(store)))
  e.target.blur()
}

export default store =>
  bel`<button
    class="${styles.button} ${getPlayStateStyle(store, styles)}"
    onclick=${handleClick(store)}>
    ${getNextPlayStateText(store)}
  </button>`
