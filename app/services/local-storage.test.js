import test from 'tape'
import {loadState, saveState} from './local-storage'

const createLocalStorage = () => {
  const storage = {}

  return {
    setItem(key, value) {
      storage[key] = value || ''
    },
    getItem(key) {
      return key in storage ? storage[key] : null
    }
  }
}

test('loadState function', t => {
  const localStorage = undefined
  t.notOk(
    loadState(localStorage, 'adjusts'),
    'should return false if localStorage doesn\'t exist'
  )
  t.end()
})

test('loadState function', t => {
  const localStorage = createLocalStorage()
  t.notOk(
    loadState(localStorage, 'adjusts'),
    'should return false is the item was not defined'
  )
  t.end()
})

test('loadState function', t => {
  const localStorage = createLocalStorage()
  localStorage.setItem('state', JSON.stringify({adjusts: 'hey'}))

  const actual = loadState(localStorage, 'adjusts')
  const expected = {adjusts: 'hey'}

  t.deepEqual(actual, expected, 'should return a object')
  t.end()
})

test('saveState function', t => {
  const localStorage = createLocalStorage()
  const state = {adjusts: 'hey'}

  saveState(localStorage, state)

  const actual = localStorage.getItem('state')
  const expected = JSON.stringify(state)

  t.deepEqual(actual, expected, 'should save the state on localStorage')
  t.end()
})
