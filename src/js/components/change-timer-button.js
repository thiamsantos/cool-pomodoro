import bel from 'bel'
import {capitalize} from '../services/utils'
import {changeTimerType} from '../services/actions'

const changeTimer = ({store, timer, timerType}) => () => {
  store.dispatch(changeTimerType(timerType, timer))
}

const isActive = ({store, timerType}) =>
  store.getState().timer.type === timerType ? ' is-active' : ''

export default props =>
  bel`<button
    class="change-timer__button${isActive(props)}"
    onclick=${changeTimer(props)}>
    ${capitalize(props.timerType)}
  </button>`
