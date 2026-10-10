import { freshDevice, goOffline, stubClass, visitQuiet } from '../support/stubs';

describe('student flow', () => {
  beforeEach(() => {
    cy.visit('/login'); // any page, just to get a window for the cleanup
    freshDevice();
    stubClass();
  });

  it('lists the visible themes with their first picto and word count', () => {
    visitQuiet('/');
    cy.get('[data-cy=theme-tiles] .tile').should('have.length', 2);
    cy.contains('.tile', 'Herfst').should('contain', '12 woorden').find('img').should('be.visible');
  });

  it('shows only the games a theme can feed', () => {
    visitQuiet('/thema/t-klein');
    cy.get('[data-cy=no-games]').should('be.visible');
    visitQuiet('/thema/t-herfst');
    cy.get('[data-cy=game-tiles] .tile').should('have.length', 4);
  });

  it('plays "find the shadow" to the end', () => {
    visitQuiet('/thema/t-herfst/shadow');
    cy.get('[data-cy=choice-wrong]').first().click().should('have.class', 'no');
    for (let i = 0; i < 6; i++) {
      cy.get('[data-cy=choice-right]').click();
      cy.get('[data-cy=stars] .on').should('have.length', Math.min(i + 1, 6));
    }
    cy.get('[data-cy=done]').should('contain', 'Goed gedaan!');
    cy.get('[data-cy=done] .bigstars .i').should('have.length', 6);
    cy.get('[data-cy=again]').click();
    cy.get('[data-cy=stars] .on').should('have.length', 0);
  });

  it('never offers a picto excluded from the shadow game', () => {
    visitQuiet('/thema/t-herfst/shadow');
    for (let i = 0; i < 6; i++) {
      cy.get('[data-cy=target] .w').should('not.have.text', 'wolk');
      cy.get('[data-cy=choice-right]').click();
    }
  });

  it('plays "listen and choose" to the end', () => {
    visitQuiet('/thema/t-herfst/listen');
    cy.get('[data-cy=replay]').should('be.visible');
    for (let i = 0; i < 6; i++) cy.get('[data-cy=choice-right]').click();
    cy.get('[data-cy=done]').should('be.visible');
    cy.get('[data-cy=other]').click();
    cy.location('pathname').should('eq', '/thema/t-herfst');
  });

  it('plays memory with closed cards: a wrong pair turns back, right pairs stay', () => {
    visitQuiet('/thema/t-herfst/same/closed');
    cy.get('.mc').should('have.length', 8).and('have.class', 'down');
    cy.get('.mc').then((cards) => {
      const ids = [...new Set([...cards].map((c) => c.dataset.cy!))];
      // Two different cards: they turn back after a moment.
      cy.get(`[data-cy=${ids[0]}]`).first().click();
      cy.get(`[data-cy=${ids[1]}]`).first().click();
      cy.get('.mc.down').should('have.length', 8);
      for (const id of ids) {
        cy.get(`[data-cy=${id}]`).eq(0).click();
        cy.get(`[data-cy=${id}]`).eq(1).click();
        cy.get(`[data-cy=${id}].found`).should('have.length', 2);
      }
    });
    cy.get('[data-cy=done] .bigstars .i').should('have.length', 4);
  });

  it('keeps working offline with what is on the device', () => {
    visitQuiet('/');
    cy.get('[data-cy=theme-tiles] .tile').should('have.length', 2);
    cy.wait(500); // let the cache finish writing
    goOffline();
    visitQuiet('/');
    cy.contains('.tile', 'Herfst').click();
    cy.get('[data-cy=game-shadow]').click();
    cy.get('[data-cy=choice-right]').click();
    cy.get('[data-cy=stars] .on').should('have.length', 1);
  });

  it('downloads only new files after a change', () => {
    visitQuiet('/');
    cy.get('[data-cy=theme-tiles] .tile').should('have.length', 2);
    cy.get('@picto.all').should('have.length', 14);
    stubClass((d) => d.items.push({ ...d.items[0]!, id: 'i-new', picto_path: 'themes/t-herfst/new-peer.png' } as never));
    visitQuiet('/');
    cy.contains('.tile', 'Herfst').should('contain', '13 woorden');
    cy.get('@picto.all').should('have.length', 1);
  });
});
