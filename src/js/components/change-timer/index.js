import bel from 'bel'
import Button from './button'

export default store =>
  bel`<section class="change-timer">
    ${Button({
      timer: 1500,
      timerType: 'code',
      store
    })}
    ${Button({
      timer: 300,
      timerType: 'social',
      store
    })}
    ${Button({
      timer: 900,
      timerType: 'coffee',
      store
    })}
  </section>`
