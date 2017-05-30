import {html} from 'snabbx'
import {createStyles} from 'stylord'
import {formatTime} from '../../services/utils'

const styles = createStyles({
  display: {
    flexBasis: '100%',
    fontSize: '7.2rem',
    fontWeight: '400'
  }
})

export default time => html`<p class=${styles.display}>${formatTime(time)}</p>`
