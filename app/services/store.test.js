import test from 'tape'
import {default as store, timerInitialState, adjustsInitialState} from './store'

test('redux store', t => {
  const actual = store.getState()
  const expected = {
    timer: timerInitialState,
    adjusts: adjustsInitialState
  }

  t.deepEqual(
    actual,
    expected,
    'should return a plain object with the default state'
  )
  t.end()
})
