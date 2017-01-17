import bel from 'bel'
import TimerDisplay from '../components/timer-display'
import TimerType from '../components/timer-type'

export default state =>
  bel`<div class="timer">
    ${TimerDisplay(state.timer.value)}
    ${TimerType(state.timer.type)}
  </div>`
