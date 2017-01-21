import bel from 'bel'
import {TIMER_TYPES} from '../../services/utils'
import Button from './button'
import styles from './styles.css'

export default store =>
  bel`<section class=${styles.changeTimer}>
    ${TIMER_TYPES.map(item =>
      Button({
        timer: item.value,
        timerType: item.type,
        store
      })
    )}
  </section>`
