import bel from 'bel'
import Info from './info'
import Control from './control'

export default store =>
  bel`<section class="adjusts">
    ${Info()}
    <div class="adjusts__controls">
      ${Control(store, 'notification')}
      ${Control(store, 'sound')}
      ${Control(store, 'vibration')}
    </div>
  </section>`
