import test from 'tape'
import store from './store'
import {timerInitialState, adjustsInitialState} from './reducers'

test('redux store', t => {
  const actual = store.getState()
  const expected = {
    timer: timerInitialState,
    adjusts: adjustsInitialState
  }

  t.deepEqual(
    actual,
    expected,
    'should return a plain object with the default state')
  t.end()
})
