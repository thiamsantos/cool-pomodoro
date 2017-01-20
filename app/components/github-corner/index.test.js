import test from 'tape'
import browserEnv from 'browser-env'
import GithubCorner from './'

browserEnv(['document'])

test('github corner component', t => {
  const wrapper = document.createElement('div')
  wrapper.innerHTML = GithubCorner('git.io')

  const actual = wrapper.querySelector('a').href
  const expected = 'git.io'

  t.equal(actual, expected, 'the link should have as href the url passed')
  t.end()
})
