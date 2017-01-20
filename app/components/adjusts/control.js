import bel from 'bel'
import {toggleAdjust} from '../../services/actions'
import {capitalize} from '../../services/utils'
import styles from './styles.css'

export const handleChange = (store, name) => () => {
  store.dispatch(toggleAdjust(name.toLowerCase()))
}

export default (store, name) =>
  bel`<div class=${styles.control}>
    <input
      type="checkbox"
      id="${name}"
      class=${styles.input}
      onchange=${handleChange(store, name)}
      checked=${store.getState().adjusts[name]} >
    <label for="${name}" class=${styles.label}>
      <span class=${styles.box}></span>
      ${capitalize(name)}
    </label>
  </div>`
