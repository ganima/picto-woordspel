// Runs against the real Supabase project with the public key only; no staff password needed.
describe('app shell', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('shows the theme menu to students without a login', () => {
    cy.visit('/');
    cy.contains('h1', 'Kies een thema');
    cy.get('[data-cy=theme-tiles], [data-cy=no-themes]').should('exist');
  });

  it('sends staff screens to the login page', () => {
    cy.visit('/beheer/personeel');
    cy.location('pathname').should('eq', '/login');
    cy.location('search').should('contain', 'next=%2Fbeheer%2Fpersoneel');
  });

  it('opens the login only after holding the gear', () => {
    cy.visit('/');
    cy.get('[data-cy=staff-door]').trigger('pointerdown', { pointerId: 1 }).trigger('pointerup', { pointerId: 1 });
    cy.location('pathname').should('eq', '/');
    cy.get('[data-cy=staff-door]').trigger('pointerdown', { pointerId: 1 });
    cy.wait(1200);
    cy.location('pathname').should('eq', '/login');
  });

  it('rejects a wrong password with a clear message', () => {
    cy.visit('/login');
    cy.get('[data-cy=email]').type('nobody@example.com');
    cy.get('[data-cy=password]').type('wrong-password');
    cy.get('[data-cy=submit]').click();
    cy.get('[data-cy=login-error]').should('contain', 'Controleer het e-mailadres');
  });

  it('switches the interface to English and remembers it', () => {
    cy.visit('/login');
    cy.get('[data-cy=lang-en]').click();
    cy.contains('h1', 'Sign in');
    cy.reload();
    cy.contains('h1', 'Sign in');
    cy.get('html').should('have.attr', 'lang', 'en');
  });
});

// Optional: set CYPRESS_STAFF_EMAIL and CYPRESS_STAFF_PASSWORD to also test a real staff login.
describe('staff login', () => {
  const email = Cypress.env('STAFF_EMAIL') as string | undefined;
  const password = Cypress.env('STAFF_PASSWORD') as string | undefined;

  it('signs in, shows the role, and signs out', function () {
    if (!email || !password) this.skip();
    cy.visit('/login');
    cy.get('[data-cy=email]').type(email!);
    cy.get('[data-cy=password]').type(password!, { log: false });
    cy.get('[data-cy=submit]').click();
    cy.location('pathname').should('eq', '/beheer/themas');
    cy.get('[data-cy=role]').should('be.visible');
    cy.get('[data-cy=sign-out]').click();
    cy.location('pathname').should('eq', '/');
  });
});
