import bel from 'bel'
import Info from './info'
import Control from './control'
import styles from './styles.css'

export default store =>
  bel`<section class=${styles.adjusts}>
    ${Info()}
    <div class=${styles.controls}>
      ${Control(store, 'notification')}
      ${Control(store, 'sound')}
      ${Control(store, 'vibration')}
    </div>
  </section>`
