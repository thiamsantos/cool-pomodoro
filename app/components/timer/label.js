import bel from 'bel'
import {StyleSheet, css} from 'aphrodite/no-important'
import {cssVariables} from '../../services/utils'

const styles = StyleSheet.create({
  label: {
    color: cssVariables.textColorAccent,
    flexBasis: '100%',
    fontSize: '2.4rem'
  }
})

export default type =>
  bel`<p class=${css(styles.label)}>The ${type} time!</p>`
