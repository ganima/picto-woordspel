import type nl from './nl';

const en: typeof nl = {
  app: {
    title: 'Picto Word Game',
    loading: 'Loading…',
    back: 'Back',
    offline: 'No connection. Try again later.',
    retry: 'Try again',
  },
  student: {
    chooseTheme: 'Choose a theme',
    noThemes: 'No theme yet',
    noThemesHint: 'The teacher has not made a theme ready yet.',
    words: '{n} word | {n} words',
    gamesSoon: 'The games will appear here.',
    staffDoor: 'Press and hold for the teacher',
  },
  login: {
    title: 'Sign in',
    intro: 'For the teacher and the admin. Students do not sign in.',
    email: 'Email address',
    password: 'Password',
    submit: 'Sign in',
    busy: 'Working…',
    errCredentials: 'Signing in failed. Check the email address and the password.',
    errNotStaff: 'This account has no role yet. Ask the admin to add you.',
    errNetwork: 'No connection to the server. Check the wifi and try again.',
    toClass: 'To the class',
  },
  staff: {
    signedInAs: 'Signed in as {name}',
    signOut: 'Sign out',
    toClass: 'Class screen',
    roles: { admin: 'Admin', juf: 'Teacher' },
    nav: {
      themes: 'Themes',
      games: 'Games',
      staff: 'Staff',
      device: 'This device',
    },
    comingSoon: 'This screen comes in a next step.',
    themesIntro: 'Here you create themes, add pictos and record the words.',
    gamesIntro: 'Here you switch games on or off for the class.',
    staffIntro: 'Here you manage who is teacher or admin.',
  },
  device: {
    title: 'Settings for this device',
    hint: 'These settings apply to this device only.',
    lang: 'Language',
    choices: 'Number of choices',
    showWords: 'Show the word under the picto',
    ding: 'Soft sound on a correct answer',
  },
  lang: { nl: 'Nederlands', en: 'English' },
};

export default en;
