import bel from 'bel'
import {capitalize} from '../../services/utils'
import {changeTimerType} from '../../services/actions'
import styles from './styles.css'

export const changeTimer = ({store, timer, timerType}) => () => {
  store.dispatch(changeTimerType(timerType, timer))
}

export const isActive = ({store, timerType}, styles) =>
  store.getState().timer.type === timerType ? styles.buttonActive : ''

export default props =>
  bel`<button
    class="${styles.button} ${isActive(props, styles)}"
    onclick=${changeTimer(props)}>
    ${capitalize(props.timerType)}
  </button>`
