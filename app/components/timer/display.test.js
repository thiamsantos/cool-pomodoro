import test from 'tape'
import browserEnv from 'browser-env'
import Display from './display'

browserEnv(['document'])

test('display component', t => {
  const wrapper = document.createElement('div')
  wrapper.innerHTML = Display(90)

  const actual = wrapper.querySelector('p').textContent
  const expected = '01:30'

  t.equal(
    actual,
    expected,
    'the text content should be a formatted time given the seconds')
  t.end()
})
