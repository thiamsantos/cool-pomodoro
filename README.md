# [Cool Pomodoro](https://thiamsantos.github.io/cool-pomodoro/)

[![Travis](https://img.shields.io/travis/thiamsantos/cool-pomodoro.svg)](https://travis-ci.org/thiamsantos/cool-pomodoro)
[![Coveralls](https://img.shields.io/coveralls/thiamsantos/cool-pomodoro.svg)](https://coveralls.io/github/thiamsantos/cool-pomodoro?branch=master)
[![GitHub release](https://img.shields.io/github/release/thiamsantos/cool-pomodoro.svg)](https://github.com/thiamsantos/cool-pomodoro/releases/latest)
[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)

> Pomodoro timer for developers built with cool libraries :sunglasses:

*Note: This project is reimplementation of the awesome [react-pomodoro](https://github.com/afonsopacifer/react-pomodoro) by [@afonsopacifer](https://github.com/afonsopacifer).*

The main goal of the project is build a complete react-like app using only the coolest libraries of the present. To do so it is used:
- [snabbx](https://github.com/thiamsantos/snabbx) for composable snabbdom virtual-nodes using tagged template stringss. An good alternative to [jsx](https://facebook.github.io/react/docs/introducing-jsx.html).
- [snabbdom](https://github.com/snabbdom/snabbdom) for provide a virtual DOM library with focus on simplicity, modularity, powerful features and performance.
- [redux](https://github.com/reactjs/redux) for a predictable state management.
- [stylord](https://github.com/thiamsantos/stylord) for an easy modular and reusable CSS using [CSS in JS](https://speakerdeck.com/vjeux/react-css-in-js).
- [pareto.js](https://github.com/concretesolutions/pareto.js) for extremely small, intuitive and fast functional helpers. An good alternative to [lodash](https://lodash.com/).

PS: If you know some other cool library that can be added to the project, feel free to open a issue to discuss about it. :wink:

## Features
- Timer for code: 25 minutes.
- Timer for coffee: 5 minutes.
- Timer for social: 15 minutes.
- Time display on the screen.
- Time display on page's title.
- Add to homescreen.
- Vibrate when the time is over.
- Sound notification when the time is over.
- Offline support.
- Web notifications support.

## Keyboard Shortcuts
- Space: play/pause the timer.
- Ctrl + Arrow Right: Change the timer type.
- Ctrl + Arrow Left: Change the timer type.

## Running locally
First of all, install the dependecies to run this project
- [NodeJS](https://nodejs.org/en/)
- [yarn](https://yarnpkg.com/) (optional dependency)

```sh
# Clone this repository
$ git clone https://github.com/thiamsantos/cool-pomodoro.git
$ cd cool-pomodoro

# Install the dependencies
$ yarn

# or with you use npm
$ npm install

# Run the build script and start the server
$ npm start
```
With the server running go to [localhost:3000](http://localhost:3000).

## Contributing
See the [contributing file](CONTRIBUTING.md).

## License
[MIT License](LICENSE.md) &copy; [Thiago Santos](https://thiamsantos.github.io/)
