export const loadState = localStorage => {
  try {
    const serializedState = localStorage.getItem('state')
    if (serializedState === null) {
      return false
    }
    return JSON.parse(serializedState)
  } catch (err) {
    return false
  }
}

export const saveState = (localStorage, state) => {
  try {
    const serializedState = JSON.stringify(state)
    localStorage.setItem('state', serializedState)
  } catch (err) {}
}
