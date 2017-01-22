import bel from 'bel'
import {capitalize} from '../../services/utils'
import {changeTimerType} from '../../services/actions'
import styles from './styles.css'

export const changeTimer = ({dispatch, timer}) => e => {
  dispatch(changeTimerType(timer.type, timer.value))
  e.target.blur()
}

export const isActive = ({state, timerType, styles}) =>
  state.timer.type === timerType ? styles.buttonActive : ''

export default ({state, dispatch, timer}) =>
  bel`<button
    class="${styles.button} ${isActive({state, timerType: timer.type, styles})}"
    onclick=${changeTimer({dispatch, timer})}>
    ${capitalize(timer.type)}
  </button>`
