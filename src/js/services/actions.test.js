import test from 'tape'
import {
  decrementTimer,
  changeTimerType,
  changeTimerPlayState,
  toggleAdjust
} from './actions'

test('decrementTimer action', t => {
  const actual = decrementTimer()
  const expected = {
    type: 'DECREMENT_TIMER'
  }

  t.deepEqual(
    actual,
    expected,
    'should return a plain object with just the type property')
  t.end()
})

test('changeTimerType action', t => {
  const actual = changeTimerType('code', 1200)
  const expected = {
    type: 'CHANGE_TIMER_TYPE',
    payload: {
      type: 'code',
      value: 1200
    }
  }

  t.deepEqual(
    actual,
    expected,
    'should return a plain object following flux-standard-action')
  t.end()
})

test('changeTimerPlayState action', t => {
  const actual = changeTimerPlayState('running')
  const expected = {
    type: 'CHANGE_TIMER_PLAY_STATE',
    payload: {
      state: 'running'
    }
  }

  t.deepEqual(
    actual,
    expected,
    'should return a plain object with the new pay state')
  t.end()
})

test('toggleAdjust action', t => {
  const actual = toggleAdjust('vibration')
  const expected = {
    type: 'TOGGLE_ADJUST',
    payload: {
      name: 'vibration'
    }
  }

  t.deepEqual(
    actual,
    expected,
    'should return a plain object with the name of the field to be toggled')
  t.end()
})
