import {html} from 'snabbx'
import {createStyles} from 'stylord'
import {cssVariables} from '../../services/utils'

const styles = createStyles({
  label: {
    color: cssVariables.textColorAccent,
    flexBasis: '100%',
    fontSize: '2.4rem'
  }
})

export default type => html`<p class=${styles.label}>The ${type} time!</p>`
