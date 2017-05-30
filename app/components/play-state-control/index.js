import {html} from 'snabbx'
import {pipe} from 'paretojs'
import {createStyles} from 'stylord'
import {convert as color} from 'css-color-function'
import {changeTimerPlayState} from '../../services/actions'
import {
  getNextPlayState,
  isPaused,
  getNextPlayStateText,
  cssVariables
} from '../../services/utils'
import store from '../../services/store'

export const handleClick = e => {
  const actionCreator = pipe(getNextPlayState, changeTimerPlayState)
  const action = actionCreator(store.getState())
  store.dispatch(action)
  e.target.blur()
}

const buttonFocusStyle = {
  backgroundColor: color(`color(${cssVariables.textColor} a(54%))`)
}

const styles = createStyles({
  button: {
    appearance: 'none',
    backgroundColor: cssVariables.textColor,
    borderRadius: '50%',
    color: 'transparent',
    display: 'block',
    height: '5rem',
    left: '50%',
    marginTop: '3rem',
    position: 'relative',
    transform: 'translateX(-50%)',
    userSelect: 'none',
    width: '5rem',
    ':focus': buttonFocusStyle,
    ':hover': buttonFocusStyle,
    ':before': {
      borderBottom: '1.25rem solid transparent',
      borderLeft: `2rem solid ${cssVariables.darkColor}`,
      borderTop: '1.25rem solid transparent',
      content: '""',
      display: 'block',
      height: 0,
      left: '1.75rem',
      opacity: 0,
      position: 'absolute',
      top: '1.25rem',
      width: 0
    },
    ':after': {
      borderLeft: `.75rem solid ${cssVariables.darkColor}`,
      borderRight: `.75rem solid ${cssVariables.darkColor}`,
      content: '""',
      display: 'block',
      height: '2.25rem',
      left: '50%',
      opacity: 1,
      position: 'absolute',
      top: '50%',
      transform: 'translateX(-50%) translateY(-50%)',
      width: '2rem'
    }
  },
  play: {
    ':after': {
      opacity: 0
    },
    ':before': {
      opacity: 1
    }
  }
})

export default ({state}) => html`<button
  class=${{[styles.button]: true, [styles.play]: isPaused(state)}}
  onclick=${handleClick}>
    ${getNextPlayStateText(state)}
  </button>`
