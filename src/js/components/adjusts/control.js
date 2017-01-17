import bel from 'bel'
import {toggleAdjust} from '../../services/actions'
import {capitalize} from '../../services/utils'

const handleChange = (store, name) => () => {
  store.dispatch(toggleAdjust(name.toLowerCase()))
}

export default (store, name) =>
  bel`<div>
    <input
      type="checkbox"
      id="${name}"
      onchange=${handleChange(store, name)}
      checked=${store.getState().adjusts[name]} >
    <label for="${name}">${capitalize(name)}</label>
  </div>`
