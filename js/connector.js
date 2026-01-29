const LINKS_KEY = 'card-links';

// Helper function to get links for a card
async function getCardLinks(t, cardId) {
  try {
    const links = await t.get('board', 'shared', LINKS_KEY, {}) || {};
    // Ensure we return an array
    const cardLinks = links[cardId];
    return Array.isArray(cardLinks) ? cardLinks : [];
  } catch (e) {
    console.error('Error getting card links:', e);
    return [];
  }
}

// Helper function to save links for a card
async function saveCardLinks(t, cardId, linkedCardIds) {
  try {
    const allLinks = await t.get('board', 'shared', LINKS_KEY, {}) || {};
    // Ensure linkedCardIds is an array of strings
    const cleanLinks = Array.isArray(linkedCardIds)
      ? linkedCardIds.filter(id => typeof id === 'string' && id.length > 0)
      : [];
    allLinks[cardId] = cleanLinks;
    await t.set('board', 'shared', LINKS_KEY, allLinks);
  } catch (e) {
    console.error('Error saving card links:', e);
  }
}

// Helper function to add a bidirectional link
async function addLink(t, cardId1, cardId2) {
  // Get all links in one read to avoid race conditions
  const allLinks = await t.get('board', 'shared', LINKS_KEY, {}) || {};

  const links1 = allLinks[cardId1] || [];
  const links2 = allLinks[cardId2] || [];

  if (!links1.includes(cardId2)) {
    links1.push(cardId2);
  }
  if (!links2.includes(cardId1)) {
    links2.push(cardId1);
  }

  // Update both cards in the object
  allLinks[cardId1] = links1;
  allLinks[cardId2] = links2;

  // Single write operation
  await t.set('board', 'shared', LINKS_KEY, allLinks);
}

// Helper function to remove a bidirectional link
async function removeLink(t, cardId1, cardId2) {
  // Get all links in one read to avoid race conditions
  const allLinks = await t.get('board', 'shared', LINKS_KEY, {}) || {};

  const links1 = allLinks[cardId1] || [];
  const links2 = allLinks[cardId2] || [];

  const filteredLinks1 = links1.filter(id => id !== cardId2);
  const filteredLinks2 = links2.filter(id => id !== cardId1);

  // Update both cards in the object
  allLinks[cardId1] = filteredLinks1;
  allLinks[cardId2] = filteredLinks2;

  // Single write operation
  await t.set('board', 'shared', LINKS_KEY, allLinks);
}

// Initialize the Power-Up
window.TrelloPowerUp.initialize({
  // Card buttons - shown on the back of cards
  'card-buttons': async function(t, options) {
    const context = t.getContext();
    const currentCardId = context.card;

    return [{
      icon: 'https://cdn.glitch.com/1b42d7fe-bda8-4af8-a6c8-eff0cea9e08a%2Frocket-ship.png?1494946700421',
      text: 'Add Link',
      callback: async function(t) {
        // Get all cards on the board except the current card
        const allCards = await t.cards('all');
        const availableCards = allCards.filter(card => card.id !== currentCardId);

        // Get already linked cards to mark them
        const linkedCardIds = await getCardLinks(t, currentCardId);

        const items = availableCards.map(card => ({
          text: linkedCardIds.includes(card.id) ? `${card.name} (already linked)` : card.name,
          callback: async function(t) {
            if (!linkedCardIds.includes(card.id)) {
              await addLink(t, currentCardId, card.id);
            }
            t.closePopup();
          }
        }));

        if (items.length === 0) {
          return t.alert({
            message: 'No other cards available on this board to link.',
            duration: 3
          });
        }

        return t.popup({
          title: 'Select a card to link',
          items: function(t, options) {
            const searchTerm = (options.search || '').toLowerCase();
            if (!searchTerm) {
              return items;
            }
            return items.filter(item =>
              item.text.toLowerCase().includes(searchTerm)
            );
          },
          search: {
            count: items.length,
            placeholder: 'Search cards...',
            empty: 'No cards found',
            searching: 'Searching...'
          }
        });
      }
    }, {
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
