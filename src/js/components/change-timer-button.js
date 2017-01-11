import bel from 'bel'
import {capitalize} from '../services/utils'

const changeTimer = ({timer, store, timerType}) => () => {
  store.dispatch({
    type: 'CHANGE_TIMER',
    timer,
    timerType
  })
}

const isActive = ({store, timerType}) =>
  store.getState().timerType === timerType ? ' is-active': ''

export default props =>
  bel`<button class="change-timer__button${isActive(props)}" onclick=${changeTimer(props)}>
    ${capitalize(props.timerType)}
  </button>`
