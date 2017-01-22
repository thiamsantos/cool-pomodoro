import bel from 'bel'
import Info from './info'
import Control from './control'
import styles from './styles.css'

export default ({state, dispatch}) =>
  bel`<section class=${styles.adjusts}>
    ${Info()}
    <div class=${styles.controls}>
      ${['notification', 'sound', 'vibration']
        .map(name => Control({state, dispatch, name}))
      }
    </div>
  </section>`
