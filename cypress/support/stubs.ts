// Answers the Supabase requests of the student screens from fixtures, so the student flow can be tested
// without putting test data in the real project. Pictos are the prototype's sample drawings.

interface ClassData {
  themes: { id: string }[];
  items: { theme_id: string; picto_path: string }[];
  games: unknown[];
}

export function stubClass(modify?: (d: ClassData) => void) {
  cy.fixture<ClassData>('class.json').then((data) => {
    modify?.(data);
    cy.intercept('GET', '**/rest/v1/themes*', data.themes).as('themes');
    cy.intercept('GET', '**/rest/v1/games*', data.games).as('games');
    cy.intercept('GET', '**/rest/v1/theme_items*', data.items).as('items');
    cy.intercept('GET', '**/storage/v1/object/public/media/themes/*/*.png', (req) => {
      // "themes/t/new-peer.png" is served the peer drawing, so tests can add files under new names.
      const word = /([a-z]+)\.png$/.exec(req.url)![1];
      req.reply({ fixture: `pictos/${word}.png`, headers: { 'content-type': 'image/png' } });
    }).as('picto');
  });
}

export function goOffline() {
  cy.intercept('GET', '**/rest/v1/**', { forceNetworkError: true });
  cy.intercept('GET', '**/storage/v1/**', { forceNetworkError: true });
}

/** Visit without the ding and the computer voice, so rounds don't wait for sound. */
export function visitQuiet(path: string) {
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem('picto.settings.v1', JSON.stringify({ ding: false }));
      delete (win as Partial<Window>).speechSynthesis;
    },
  });
}

/** Throw away the IndexedDB cache and service worker state between tests. */
export function freshDevice() {
  cy.window({ log: false }).then(
    (win) =>
      new Cypress.Promise<void>((resolve) => {
        const req = win.indexedDB.deleteDatabase('picto-woordspel');
        req.onsuccess = req.onerror = req.onblocked = () => resolve();
      }),
  );
}
