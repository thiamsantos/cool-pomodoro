import test from 'tape'
import browserEnv from 'browser-env'
import Label from './label'

browserEnv(['document'])

test('label component', t => {
  const wrapper = document.createElement('div')
  wrapper.innerHTML = Label('social')

  const actual = wrapper.querySelector('p').textContent
  const expected = 'The social time!'

  t.equal(
    actual,
    expected,
    'the text content should descrive the type of the current time'
  )
  t.end()
})
