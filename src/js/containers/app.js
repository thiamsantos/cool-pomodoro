import bel from 'bel'
import ControlButton from '../components/control-button'
import Footer from '../components/footer'
import Timer from './timer'
import ChangeTimer from './change-timer'

const handleChange = (store, item) => () => {
  store.dispatch({
    type: 'TOOGLE_' + item.toUpperCase()
  })
}

export default store =>
  bel`<div id="app">
    <main class="main">
      ${Timer(store.getState())}
      ${ControlButton(store)}
      ${ChangeTimer(store)}
    </main>
    <section class="adjusts">
      <a
        href="https://en.wikipedia.org/wiki/Pomodoro_Technique"
        rel="noopener"
        target="_blank"
        class="adjusts__info">
        What is Pomodoro?
      </a>
      <div class="adjusts__controls">
        <input
          type="checkbox"
          id="notification"
          onchange=${handleChange(store, 'notification')}
          checked=${store.getState().notification}
          />
        <label for="notification">Notification</label>

        <input
          type="checkbox"
          id="sound"
          onchange=${handleChange(store, 'sound')}
          checked=${store.getState().sound}
          />
        <label for="sound">Sound</label>

        <input
          type="checkbox"
          id="vibration"
          onchange=${handleChange(store, 'vibration')}
          checked=${store.getState().vibration}
          />
        <label for="vibration">Vibration</label>
      </div>
    </section>
    ${Footer()}
  </div>`
