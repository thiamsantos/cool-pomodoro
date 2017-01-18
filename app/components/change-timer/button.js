import bel from 'bel'
import {capitalize} from '../../services/utils'
import {changeTimerType} from '../../services/actions'
import styles from './styles.css'

const changeTimer = ({store, timer, timerType}) => () => {
  store.dispatch(changeTimerType(timerType, timer))
}

const isActive = ({store, timerType}) =>
  store.getState().timer.type === timerType ? styles.buttonActive : ''

export default props =>
  bel`<button
    class="${styles.button} ${isActive(props)}"
    onclick=${changeTimer(props)}>
    ${capitalize(props.timerType)}
  </button>`
