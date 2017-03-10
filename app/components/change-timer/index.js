import bel from 'bel'
import {StyleSheet, css} from 'aphrodite/no-important'
import {TIMER_TYPES} from '../../services/utils'
import Button from './button'

const styles = StyleSheet.create({
  changeTimer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    marginLeft: '1rem',
    marginRight: '1rem',
    marginTop: '3rem',

    '@media (min-width: 300px)': {
      flexDirection: 'row'
    }
  }
})

export default ({state, dispatch}) =>
  bel`<section class=${css(styles.changeTimer)}>
    ${TIMER_TYPES.map(item =>
      Button({
        timer: item,
        state,
        dispatch
      })
    )}
  </section>`
