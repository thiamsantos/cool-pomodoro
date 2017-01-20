import test from 'tape'
import browserEnv from 'browser-env'
import store from '../../services/store'
import {
  isPaused,
  getNextPlayState,
  getText,
  default as PlayStateControl,
  getPlayStateStyle,
  handleClick
} from './'

browserEnv(['document'])

const createFakeStore = playState => ({
  getState: () => ({
    timer: {
      playState
    }
  })
})

test('isPaused function', t => {
  const store = createFakeStore('running')
  t.notOk(isPaused(store), 'by default the state should be running')
  t.end()
})

test('isPaused function', t => {
  const store = createFakeStore('paused')

  t.ok(isPaused(store), 'should return true')
  t.end()
})

test('getNextPlayState function', t => {
  const store = createFakeStore('running')
  const actual = getNextPlayState(store)
  const expected = 'paused'

  t.equal(actual, expected, 'should return the next play state: paused')
  t.end()
})

test('getNextPlayState function', t => {
  const store = createFakeStore('paused')

  const actual = getNextPlayState(store)
  const expected = 'running'

  t.equal(actual, expected, 'should return the next play state: running')
  t.end()
})

test('getText function', t => {
  const store = createFakeStore('running')
  const actual = getText(store)
  const expected = 'pause'

  t.equal(
    actual,
    expected,
    'should return the type of the action to be triggered: pause')
  t.end()
})

test('getText function', t => {
  const store = createFakeStore('paused')

  const actual = getText(store)
  const expected = 'play'

  t.equal(
    actual,
    expected,
    'should return the type of the action to be triggered: play')
  t.end()
})

test('getPlayStateStyle function', t => {
  const store = createFakeStore('running')
  const styles = {
    play: 'play',
    pause: 'pause'
  }

  const actual = getPlayStateStyle(store, styles)
  const expected = 'pause'

  t.equal(
    actual,
    expected,
    'should return a className')
  t.end()
})

test('getPlayStateStyle function', t => {
  const store = createFakeStore('paused')
  const styles = {
    play: 'play',
    pause: 'pause'
  }

  const actual = getPlayStateStyle(store, styles)
  const expected = 'play'

  t.equal(
    actual,
    expected,
    'should return a className')
  t.end()
})

test('PlayStateControl component', t => {
  const store = createFakeStore('paused')

  const wrapper = document.createElement('div')
  wrapper.innerHTML = PlayStateControl(store)

  const actual = wrapper.querySelector('button').textContent.trim()
  const expected = 'play'

  t.equal(
    actual,
    expected,
    'the textContent should be the action to be triggered')
  t.end()
})

test('PlayStateControl component', t => {
  const store = createFakeStore('running')

  const wrapper = document.createElement('div')
  wrapper.innerHTML = PlayStateControl(store)

  const actual = wrapper.querySelector('button').textContent.trim()
  const expected = 'pause'

  t.equal(
    actual,
    expected,
    'the textContent should be the action to be triggered')
  t.end()
})

test('handleClick function', t => {
  t.equal(
    store.getState().timer.playState,
    'running',
    'the initial value should be running')

  handleClick(store)()

  t.equal(
    store.getState().timer.playState,
    'paused',
    'after clicking should change the playState')

  handleClick(store)()

  t.equal(
    store.getState().timer.playState,
    'running',
    'after clicking again should change the playState')
  t.end()
})
