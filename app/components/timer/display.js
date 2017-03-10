import bel from 'bel'
import {StyleSheet, css} from 'aphrodite/no-important'
import {formatTime} from '../../services/utils'

const styles = StyleSheet.create({
  display: {
    flexBasis: '100%',
    fontSize: '7.2rem',
    fontWeight: '400'
  }
})

export default time =>
  bel`<p class=${css(styles.display)}>${formatTime(time)}</p>`
