import bel from 'bel'
import {StyleSheet, css} from 'aphrodite/no-important'
import {toggleAdjust} from '../../services/actions'
import {capitalize, cssVariables} from '../../services/utils'

export const handleChange = (dispatch, name) => () => {
  dispatch(toggleAdjust(name.toLowerCase()))
}

const labelCheckedAfterBeforeStyle = {
  backgroundColor: cssVariables.accentColor,
  content: '""',
  display: 'block',
  position: 'absolute',
  transform: 'rotate(45deg)'
}

const styles = StyleSheet.create({
  control: {
    marginTop: '1rem',
    '@media (min-width: 450px)': {
      marginTop: 0,
      ':not(:last-child)': {
        paddingRight: '3rem'
      }
    }
  },
  box: {
    backgroundColor: 'transparent',
    border: '.1rem solid currentColor',
    display: 'block',
    height: '2rem',
    left: '-3rem',
    position: 'absolute',
    top: '0',
    width: '2rem'
  },
  label: {
    position: 'relative'
  },
  labelChecked: {
    ':after': {
      ...labelCheckedAfterBeforeStyle,
      bottom: 0,
      height: '2rem',
      left: '-1.8rem',
      width: '.5rem'
    },
    ':before': {
      ...labelCheckedAfterBeforeStyle,
      bottom: '.4rem',
      height: '.5rem',
      left: '-2.8rem',
      width: '1rem'
    }
  },
  input: {
    visibility: 'hidden'
  }
})

export default ({state, dispatch, name}) =>
  bel`<div class=${css(styles.control)}>
    <input
      type="checkbox"
      id="${name}"
      class=${css(styles.input)}
      onchange=${handleChange(dispatch, name)}
      checked=${state.adjusts[name]} >
    <label
      for="${name}"
      class=${css(styles.label, state.adjusts[name] && styles.labelChecked)}>
      <span class=${css(styles.box)}></span>
      ${capitalize(name)}
    </label>
  </div>`
