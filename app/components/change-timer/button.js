import {html} from 'snabbx'
import {createStyles} from 'stylord'
import {capitalize, cssVariables} from '../../services/utils'
import {changeTimerType} from '../../services/actions'

const buttonFocusStyles = {
  backgroundColor: cssVariables.brandColorDark
}

const styles = createStyles({
  active: {
    backgroundColor: cssVariables.brandColorLight + '!important'
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
  const action = changeTimerType(timer.type, timer.value)
  dispatch(action)
  e.target.blur()
}

export default ({state, dispatch, timer}) =>
  html`<button
  class=${{[styles.button]: true, [styles.active]: state.timer.type === timer.type}}
  onclick=${changeTimer({dispatch, timer})}>
    ${capitalize(timer.type)}
  </button>`
