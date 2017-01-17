import test from 'tape'
import {formatTime, capitalize, getTitle} from './utils'

test('formatTime function', t => {
  const actual = formatTime(1200)
  const expected = '20:00'

  t.equal(actual, expected, 'should format seconds to a human-friendly string')
  t.end()
})

test('capitalize function', t => {
  const actual = capitalize('hey there')
  const expected = 'Hey there'

  t.equal(actual, expected, 'should capitalize the given string')
  t.end()
})

test('getTitle function', t => {
  const store = {
    getState() {
      return {
        timer: {
          value: 1200
        }
      }
    }
  }
  const actual = getTitle(store)
  const expected = '20:00 | Pomodoro Timer'

  t.equal(
    actual,
    expected,
    'should return a string with the formatted title given the store')
  t.end()
})
