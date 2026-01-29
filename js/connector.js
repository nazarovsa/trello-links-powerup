const LINKS_KEY = 'card-links';

// Clean and validate the entire links data structure
async function cleanLinksData(t) {
  try {
    const linksString = await t.get('board', 'shared', LINKS_KEY, '{}');
    const allLinks = JSON.parse(linksString);
    const cleaned = {};
    let needsCleaning = false;

    // Validate each entry
    for (const [cardId, links] of Object.entries(allLinks)) {
      if (typeof cardId === 'string' && cardId.length > 0 && Array.isArray(links)) {
        // Filter to only valid card IDs
        const validLinks = links.filter(id => typeof id === 'string' && id.length > 0);
        if (validLinks.length > 0) {
          cleaned[cardId] = validLinks;
        }
        if (validLinks.length !== links.length) {
          needsCleaning = true;
        }
      } else {
        needsCleaning = true;
      }
    }

    // If we found invalid data, save the cleaned version
    if (needsCleaning || Object.keys(cleaned).length !== Object.keys(allLinks).length) {
      await t.set('board', 'shared', LINKS_KEY, JSON.stringify(cleaned));
      console.log('Cleaned card links data');
    }

    return cleaned;
  } catch (e) {
    console.error('Error cleaning links data:', e);
    // If all else fails, reset to empty
    await t.set('board', 'shared', LINKS_KEY, '{}');
    return {};
  }
}

// Helper function to get links for a card
async function getCardLinks(t, cardId) {
  try {
    const linksString = await t.get('board', 'shared', LINKS_KEY, '{}');
    const links = JSON.parse(linksString);
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
    const linksString = await t.get('board', 'shared', LINKS_KEY, '{}');
    const allLinks = JSON.parse(linksString);
    // Ensure linkedCardIds is an array of strings
    const cleanLinks = Array.isArray(linkedCardIds)
      ? linkedCardIds.filter(id => typeof id === 'string' && id.length > 0)
      : [];
    allLinks[cardId] = cleanLinks;
    await t.set('board', 'shared', LINKS_KEY, JSON.stringify(allLinks));
  } catch (e) {
    console.error('Error saving card links:', e);
  }
}

// Helper function to add a bidirectional link
async function addLink(t, cardId1, cardId2) {
  try {
    // Get all links in one read to avoid race conditions
    const linksString = await t.get('board', 'shared', LINKS_KEY, '{}');
    const allLinks = JSON.parse(linksString);

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

    // Single write operation - store as JSON string
    await t.set('board', 'shared', LINKS_KEY, JSON.stringify(allLinks));
    console.log('Successfully added link', cardId1, '<->', cardId2);
  } catch (e) {
    console.error('Error adding link:', e);
    console.error('Card IDs:', cardId1, cardId2);
    throw e;
  }
}

// Helper function to remove a bidirectional link
async function removeLink(t, cardId1, cardId2) {
  try {
    // Get all links in one read to avoid race conditions
    const linksString = await t.get('board', 'shared', LINKS_KEY, '{}');
    const allLinks = JSON.parse(linksString);

    const links1 = allLinks[cardId1] || [];
    const links2 = allLinks[cardId2] || [];

    const filteredLinks1 = links1.filter(id => id !== cardId2);
    const filteredLinks2 = links2.filter(id => id !== cardId1);

    // Update both cards in the object
    allLinks[cardId1] = filteredLinks1;
    allLinks[cardId2] = filteredLinks2;

    // Single write operation - store as JSON string
    await t.set('board', 'shared', LINKS_KEY, JSON.stringify(allLinks));
    console.log('Successfully removed link', cardId1, '<->', cardId2);
  } catch (e) {
    console.error('Error removing link:', e);
    throw e;
  }
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

  // Card badges - shown on the card face in board view
  'card-badges': async function(t, options) {
    // Reset corrupted data on first access (runs once per page load)
    if (!window.__linksDataCleaned) {
      try {
        // Try to get data - if it's an object (old format), reset it
        const data = await t.get('board', 'shared', LINKS_KEY);
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          // Old object format detected - reset to empty JSON string
          await t.set('board', 'shared', LINKS_KEY, '{}');
          console.log('Reset old object format to JSON string');
        } else if (!data || typeof data !== 'string') {
          // No data or invalid - initialize as empty JSON string
          await t.set('board', 'shared', LINKS_KEY, '{}');
          console.log('Initialized empty links data');
        }
      } catch (e) {
        // On any error, reset to empty
        await t.set('board', 'shared', LINKS_KEY, '{}');
        console.log('Reset links data after error');
      }
      window.__linksDataCleaned = true;
    }

    const context = t.getContext();
    const cardId = context.card;

    if (!cardId) {
      return [];
    }

    const linkedCardIds = await getCardLinks(t, cardId);

    if (linkedCardIds.length === 0) {
      return [];
    }

    return [{
      text: `🔗 ${linkedCardIds.length}`
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
