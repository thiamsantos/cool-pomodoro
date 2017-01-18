import bel from 'bel'
import Button from './button'
import styles from './styles.css'

export default store =>
  bel`<section class=${styles.changeTimer}>
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
