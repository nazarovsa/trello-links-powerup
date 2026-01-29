const LINKS_KEY = 'card-links';

// Helper function to get links for a card
async function getCardLinks(t, cardId) {
  const links = await t.get('board', 'shared', LINKS_KEY, {}) || {};
  return links[cardId] || [];
}

// Helper function to save links for a card
async function saveCardLinks(t, cardId, linkedCardIds) {
  const allLinks = await t.get('board', 'shared', LINKS_KEY, {}) || {};
  allLinks[cardId] = linkedCardIds;
  await t.set('board', 'shared', LINKS_KEY, allLinks);
}

// Helper function to add a bidirectional link
async function addLink(t, cardId1, cardId2) {
  const links1 = await getCardLinks(t, cardId1);
  const links2 = await getCardLinks(t, cardId2);

  if (!links1.includes(cardId2)) {
    links1.push(cardId2);
  }
  if (!links2.includes(cardId1)) {
    links2.push(cardId1);
  }

  await saveCardLinks(t, cardId1, links1);
  await saveCardLinks(t, cardId2, links2);
}

// Helper function to remove a bidirectional link
async function removeLink(t, cardId1, cardId2) {
  const links1 = await getCardLinks(t, cardId1);
  const links2 = await getCardLinks(t, cardId2);

  const filteredLinks1 = links1.filter(id => id !== cardId2);
  const filteredLinks2 = links2.filter(id => id !== cardId1);

  await saveCardLinks(t, cardId1, filteredLinks1);
  await saveCardLinks(t, cardId2, filteredLinks2);
}

// Initialize the Power-Up
window.TrelloPowerUp.initialize({
  // Card buttons - shown on the back of cards
  'card-buttons': function(t, options) {
    return [{
      icon: 'https://cdn.glitch.com/1b42d7fe-bda8-4af8-a6c8-eff0cea9e08a%2Frocket-ship.png?1494946700421',
      text: 'Manage Links',
      callback: function(t) {
        return t.popup({
          title: 'Manage Card Links',
          url: './views/link-manager.html',
          height: 350
        });
      }
    }];
  },

  // Card detail badges - shown in the card details section
  'card-detail-badges': async function(t, options) {
    const context = t.getContext();
    const cardId = context.card;

    if (!cardId) {
      return [];
    }

    const linkedCardIds = await getCardLinks(t, cardId);

    if (linkedCardIds.length === 0) {
      return [];
    }

    // Fetch card details for all linked cards
    const linkedCards = await Promise.all(
      linkedCardIds.map(async (id) => {
        try {
          return await t.card(id, 'id', 'name', 'url');
        } catch (e) {
          return null;
        }
      })
    );

    // Filter out any cards that couldn't be fetched (might have been deleted)
    const validLinkedCards = linkedCards.filter(card => card !== null);

    // Update storage to remove invalid links
    if (validLinkedCards.length !== linkedCardIds.length) {
      const validIds = validLinkedCards.map(card => card.id);
      await saveCardLinks(t, cardId, validIds);
    }

    return [{
      title: 'Linked Cards',
      text: `${validLinkedCards.length} card${validLinkedCards.length !== 1 ? 's' : ''}`,
      icon: 'https://cdn.glitch.com/1b42d7fe-bda8-4af8-a6c8-eff0cea9e08a%2Frocket-ship.png?1494946700421',
      callback: function(t) {
        return t.popup({
          title: 'Linked Cards',
          items: validLinkedCards.map(card => ({
            text: card.name,
            callback: async function(t) {
              await t.hideCard();
              window.open(card.url, '_blank');
            }
          }))
        });
      }
    }];
  },

  // Card back section - shown directly in card details
  'card-back-section': async function(t, options) {
    const context = t.getContext();
    const cardId = context.card;

    if (!cardId) {
      return null;
    }

    return {
      title: 'Linked Cards',
      icon: 'https://cdn.glitch.com/1b42d7fe-bda8-4af8-a6c8-eff0cea9e08a%2Frocket-ship.png?1494946700421',
      content: {
        type: 'iframe',
        url: t.signUrl('./views/card-section.html'),
        height: 200
      }
    };
  }
});
