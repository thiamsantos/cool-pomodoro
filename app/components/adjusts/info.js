import bel from 'bel'
import {StyleSheet, css} from 'aphrodite/no-important'
import {cssVariables} from '../../services/utils'

const focusInfo = {
  textDecoration: 'underline'
}

const styles = StyleSheet.create({
  info: {
    color: cssVariables.textColor,
    textAlign: 'center',
    textDecoration: 'none',
    ':focus': focusInfo,
    ':hover': focusInfo
  }
})

export default () =>
  bel`<a
    href="https://en.wikipedia.org/wiki/Pomodoro_Technique"
    rel="noopener"
    target="_blank"
    class=${css(styles.info)} >
    What is Pomodoro?
  </a>`
