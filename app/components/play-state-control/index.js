import bel from 'bel'
import {changeTimerPlayState} from '../../services/actions'
import {
  getNextPlayState,
  getPlayStateStyle,
  getNextPlayStateText
} from '../../services/utils'
import styles from './styles.css'

export const handleClick = ({state, dispatch}) => e => {
  dispatch(changeTimerPlayState(getNextPlayState(state)))
  e.target.blur()
}

export default ({state, dispatch}) =>
  bel`<button
    class="${styles.button} ${getPlayStateStyle(state, styles)}"
    onclick=${handleClick({state, dispatch})}>
    ${getNextPlayStateText(state)}
  </button>`
