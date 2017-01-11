import bel from 'bel'
import ChangeTimerButton from '../components/change-timer-button'

export default store =>
  bel`<section class="change-timer">
    ${ChangeTimerButton({
      timer: 1500,
      timerType: 'code',
      store
    })}
    ${ChangeTimerButton({
      timer: 300,
      timerType: 'social',
      store
    })}
    ${ChangeTimerButton({
      timer: 900,
      timerType: 'coffee',
      store
    })}
  </section>`
