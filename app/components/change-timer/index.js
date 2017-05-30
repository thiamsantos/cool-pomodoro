import {html} from 'snabbx'
import {createStyles} from 'stylord'
import {TIMER_TYPES} from '../../services/utils'
import Button from './button'

const styles = createStyles({
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
  html`<section class=${styles.changeTimer}>
    ${TIMER_TYPES.map(item => Button({timer: item, state, dispatch}))}
  </section>`
