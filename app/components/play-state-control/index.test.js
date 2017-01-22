import test from 'tape'
import browserEnv from 'browser-env'
import store from '../../services/store'
import {
  default as PlayStateControl,
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

test('PlayStateControl component', t => {
  const fakeStore = createFakeStore('paused')

  const wrapper = document.createElement('div')
  wrapper.innerHTML = PlayStateControl({
    state: fakeStore.getState(),
    dispatch: store.dispatch
  })

  const actual = wrapper.querySelector('button').textContent.trim()
  const expected = 'play'

  t.equal(
    actual,
    expected,
    'the textContent should be the action to be triggered')
  t.end()
})

test('PlayStateControl component', t => {
  const fakeStore = createFakeStore('running')

  const wrapper = document.createElement('div')
  wrapper.innerHTML = PlayStateControl({
    state: fakeStore.getState(),
    dispatch: store.dispatch
  })

  const actual = wrapper.querySelector('button').textContent.trim()
  const expected = 'pause'

  t.equal(
    actual,
    expected,
    'the textContent should be the action to be triggered')
  t.end()
})

test('handleClick function', t => {
  const target = document.createElement('div')

  t.equal(
    store.getState().timer.playState,
    'running',
    'the initial value should be running')

  handleClick({
    state: store.getState(),
    dispatch: store.dispatch
  })({target})

  t.equal(
    store.getState().timer.playState,
    'paused',
    'after clicking should change the playState')

  handleClick({
    state: store.getState(),
    dispatch: store.dispatch
  })({target})

  t.equal(
    store.getState().timer.playState,
    'running',
    'after clicking again should change the playState')
  t.end()
})
