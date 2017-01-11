import bel from 'bel'

const pausedTimer = store => () => {
  store.dispatch({
    type: 'PAUSE_TIMER',
    pausedTimer: !store.getState().pausedTimer
  })
}

export default store => {
  const pausedState = store.getState().pausedTimer ? 'play' : 'pause'

  return bel`<button
    class="control-button control-button--${pausedState}"
    onclick=${pausedTimer(store)}>
    ${pausedState}
  </button>`
}
