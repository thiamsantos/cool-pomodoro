import {html} from 'snabbx'
import {createStyles} from 'stylord'
import {cssVariables} from '../../services/utils'

const focusInfo = {
  textDecoration: 'underline'
}

const styles = createStyles({
  info: {
    color: cssVariables.textColor,
    textAlign: 'center',
    textDecoration: 'none',
    ':focus': focusInfo,
    ':hover': focusInfo
  }
})

export default () =>
  html`<a
    href="https://en.wikipedia.org/wiki/Pomodoro_Technique"
    rel="noopener"
    target="_blank"
    class=${styles.info} >
    What is Pomodoro?
  </a>`
