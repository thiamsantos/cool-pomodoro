import bel from 'bel'
import {changeTimerPlayState} from '../../services/actions'
import {
  getNextPlayState,
  getPlayStateStyle,
  getNextPlayStateText
} from '../../services/utils'
import store from '../../services/store'
import styles from './styles.css'

export const handleClick = e => {
  store.dispatch(changeTimerPlayState(getNextPlayState(store.getState())))
  e.target.blur()
}

export default ({state}) =>
  bel`<button
    class="${styles.button} ${getPlayStateStyle(state, styles)}"
    onclick=${handleClick}>
    ${getNextPlayStateText(state)}
  </button>`
