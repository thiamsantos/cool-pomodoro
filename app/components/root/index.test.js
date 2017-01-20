import test from 'tape'
import Root from './'

test('root component', t => {
  t.equal(typeof Root, 'function', 'should be a function')
  t.end()
})
