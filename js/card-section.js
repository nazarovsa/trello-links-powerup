const LINKS_KEY = 'card-links';

let t = window.TrelloPowerUp.iframe();
let currentCardId;

// Helper function to get links for a card
async function getCardLinks(cardId) {
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
async function saveCardLinks(cardId, linkedCardIds) {
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
async function addLink(cardId1, cardId2) {
  try {
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

    // Convert to plain object to ensure serializability
    const plainObject = JSON.parse(JSON.stringify(allLinks));

    // Single write operation
    await t.set('board', 'shared', LINKS_KEY, plainObject);
    console.log('Successfully added link', cardId1, '<->', cardId2);
  } catch (e) {
    console.error('Error adding link:', e);
    console.error('Card IDs:', cardId1, cardId2);
    throw e;
  }
}

// Helper function to remove a bidirectional link
async function removeLink(cardId1, cardId2) {
  try {
    // Get all links in one read to avoid race conditions
    const allLinks = await t.get('board', 'shared', LINKS_KEY, {}) || {};

    const links1 = allLinks[cardId1] || [];
    const links2 = allLinks[cardId2] || [];

    const filteredLinks1 = links1.filter(id => id !== cardId2);
    const filteredLinks2 = links2.filter(id => id !== cardId1);

    // Update both cards in the object
    allLinks[cardId1] = filteredLinks1;
    allLinks[cardId2] = filteredLinks2;

    // Convert to plain object to ensure serializability
    const plainObject = JSON.parse(JSON.stringify(allLinks));

    // Single write operation
    await t.set('board', 'shared', LINKS_KEY, plainObject);
    console.log('Successfully removed link', cardId1, '<->', cardId2);
  } catch (e) {
    console.error('Error removing link:', e);
    throw e;
  }
}

async function renderLinkedCards() {
  const linkedCardIds = await getCardLinks(currentCardId);
  const listElement = document.getElementById('linked-cards-list');

  if (linkedCardIds.length === 0) {
    listElement.innerHTML = '<div class="empty-state">No linked cards</div>';
    return t.sizeTo('body');
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

  // Filter out any cards that couldn't be fetched
  const validLinkedCards = linkedCards.filter(card => card !== null);

  // Update storage if some cards were deleted
  if (validLinkedCards.length !== linkedCardIds.length) {
    const validIds = validLinkedCards.map(card => card.id);
    await saveCardLinks(currentCardId, validIds);
  }

  // Render the linked cards
  listElement.innerHTML = validLinkedCards.map(card => `
    <div class="linked-card-item">
      <div class="linked-card-name" data-card-url="${card.url}">${card.name}</div>
      <button class="remove-link" data-card-id="${card.id}" title="Remove link">×</button>
    </div>
  `).join('');

  // Add click handlers for card names to open them
  document.querySelectorAll('.linked-card-name').forEach(element => {
    element.addEventListener('click', function() {
      const url = this.getAttribute('data-card-url');
      window.open(url, '_blank');
    });
  });

  // Add click handlers for remove buttons
  document.querySelectorAll('.remove-link').forEach(button => {
    button.addEventListener('click', async function() {
      const cardIdToRemove = this.getAttribute('data-card-id');
      await removeLink(currentCardId, cardIdToRemove);
      await renderLinkedCards();
    });
  });

  return t.sizeTo('body');
}

// Initialize
t.render(async function() {
  const context = t.getContext();
  currentCardId = context.card;

  await renderLinkedCards();

  // Add click handler for the "Add Link" button
  document.getElementById('add-link-btn').addEventListener('click', async function(event) {
    // Get all cards on the board except the current card
    const allCards = await t.cards('all');
    const availableCards = allCards.filter(card => card.id !== currentCardId);

    // Get already linked cards to mark them
    const linkedCardIds = await getCardLinks(currentCardId);

    const items = availableCards.map(card => ({
      text: linkedCardIds.includes(card.id) ? `${card.name} (already linked)` : card.name,
      callback: async function(t) {
        if (!linkedCardIds.includes(card.id)) {
          await addLink(currentCardId, card.id);
          await renderLinkedCards();
        }
        t.closePopup();
      }
    }));

    if (items.length === 0) {
      await t.alert({
        message: 'No other cards available on this board to link.',
        duration: 3
      });
    } else {
      await t.popup({
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
        },
        mouseEvent: event
      });
    }
  });
});
