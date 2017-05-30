import {html} from 'snabbx'
import {createStyles} from 'stylord'
import {cssVariables} from '../../services/utils'
import Info from './info'
import Control from './control'

const styles = createStyles({
  adjusts: {
    backgroundColor: cssVariables.brandColor,
    display: 'flex',
    flexDirection: 'column',
    fontSize: '1.4rem',
    padding: '1.5rem',

    '@media (min-width: 450px)': {
      flexDirection: 'row',
      justifyContent: 'space-around'
    }
  },
  controls: {
    display: 'inherit',
    flexDirection: 'inherit',
    fontSize: '1.6rem',
    paddingLeft: '2rem'
  }
})

export default ({state, dispatch}) =>
  html`<section class=${styles.adjusts}>
    ${Info()}
    <div class=${styles.controls}>
      ${['notification', 'sound', 'vibration'].map(name =>
        Control({state, dispatch, name})
      )}
    </div>
  </section>`
