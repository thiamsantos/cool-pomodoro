import bel from 'bel'
import {StyleSheet, css} from 'aphrodite/no-important'
import {capitalize, cssVariables} from '../../services/utils'
import {changeTimerType} from '../../services/actions'

const buttonFocusStyles = {
  backgroundColor: cssVariables.brandColorDark
}

const styles = StyleSheet.create({
  active: {
    backgroundColor: cssVariables.brandColorLight
  },
  button: {
    appearance: 'none',
    backgroundColor: cssVariables.brandColor,
    color: 'inherit',
    paddingBottom: '1rem',
    paddingTop: '1rem',
    width: '100%',

    ':hover': buttonFocusStyles,
    ':focus': buttonFocusStyles,

    ':not(:last-child)': {
      marginBottom: '.2rem',
      marginRight: 0
    },

    '@media (min-width: 300px)': {
      maxWidth: '10rem',
      ':not(:last-child)': {
        marginBottom: 0,
        marginRight: '.2rem'
      }
    }
  }
})

export const changeTimer = ({dispatch, timer}) => e => {
  dispatch(changeTimerType(timer.type, timer.value))
  e.target.blur()
}

export default ({state, dispatch, timer}) =>
  bel`<button
    class="${css(styles.button,
      state.timer.type === timer.type && styles.active)}"
    onclick=${changeTimer({dispatch, timer})}>
    ${capitalize(timer.type)}
  </button>`
