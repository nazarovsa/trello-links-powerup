# Trello Card Links Power-Up

A Trello Power-Up that allows you to track and manage links between cards. Linked cards are displayed in the card details section.

## Features

- **Bidirectional Links**: Create links between any two cards on the same board
- **Card Detail Badges**: See how many cards are linked directly in the card details
- **Link Management**: Easy-to-use interface for adding and removing links
- **Quick Navigation**: Click on linked cards to open them in a new tab
- **Automatic Cleanup**: Removes links to deleted cards automatically

## Project Structure

```
trello-links-powerup/
├── index.html              # Main entry point
├── manifest.json           # Power-Up configuration
├── js/
│   ├── connector.js        # Main Power-Up logic
│   └── link-manager.js     # Link management UI logic
├── views/
│   └── link-manager.html   # Link management popup
└── images/
    └── icon.png            # Power-Up icon (add your own)
```

## Setup Instructions

### 1. Host on GitHub Pages

1. Initialize a git repository (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. Create a new repository on GitHub (without initializing it)

3. Push your code to GitHub:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/trello-links-powerup.git
   git branch -M main
   git push -u origin main
   ```

4. Enable GitHub Pages:
   - Go to your repository settings
   - Navigate to "Pages" in the left sidebar
   - Under "Source", select the `main` branch
   - Click "Save"
   - Your Power-Up will be available at: `https://YOUR_USERNAME.github.io/trello-links-powerup/`

### 2. Create and Configure the Power-Up in Trello

1. Go to https://trello.com/power-ups/admin
2. Click "New" to create a new Power-Up
3. Fill in the required information:
   - **Name**: Card Links (or your preferred name)
   - **Workspace**: Select your workspace
4. Configure the Power-Up settings:
   - **Iframe Connector URL**: `https://YOUR_USERNAME.github.io/trello-links-powerup/index.html`
   - **Capabilities**: Ensure "card-buttons" and "card-detail-badges" are enabled

### 3. Add the Power-Up to a Board

1. Open a Trello board
2. Click "Power-Ups" in the board menu
3. Click "Custom" or search for your Power-Up by name
4. Click "Add" to enable it on the board

## Usage

### Adding a Link

1. Open any card
2. Click the "Manage Links" button in the card back
3. Click "+ Add Link to Card"
4. Select a card from the list
5. The link is now created (bidirectional)

### Viewing Linked Cards

1. Open any card
2. In the card details section, you'll see a "Linked Cards" badge showing the count
3. Click on the badge to see a list of all linked cards
4. Click on any card name to open it in a new tab

### Removing a Link

1. Open any card with links
2. Click the "Manage Links" button
3. Click "Remove" next to the card you want to unlink
4. The link is removed from both cards

## Customization

### Adding a Custom Icon

1. Add your icon image to the `images/` folder as `icon.png` (recommended size: 256x256px)
2. The icon is already referenced in `manifest.json`

### Changing the Icon URL in Code

Currently, the Power-Up uses a default icon URL from Trello's CDN. To use your own icon:

1. Replace all instances of the icon URL in `js/connector.js`:
   ```javascript
   icon: './images/icon.png'
   ```

2. Make sure your icon is accessible via your GitHub Pages URL

## Storage

The Power-Up stores card links at the board level using Trello's shared storage:
- Storage key: `card-links`
- Scope: Board-level, shared across all board members
- Format: `{ cardId: [linkedCardId1, linkedCardId2, ...] }`

## Limitations

- Links are board-specific (cards from different boards cannot be linked)
- Storage is limited by Trello's Power-Up storage quotas
- Links to deleted cards are automatically cleaned up when detected

## Troubleshooting

**Power-Up doesn't load:**
- Check that your GitHub Pages URL is correct and accessible
- Verify the Iframe Connector URL is properly configured in Trello Power-Up settings
- Check the browser console for errors

**Links not saving:**
- Ensure you have edit permissions on the board
- Check that the board isn't in read-only mode
- Verify storage isn't full (unlikely for normal use)

**Can't see linked cards:**
- Ensure you have access to view the linked cards
- Deleted cards won't appear (they're automatically cleaned up)

## License

MIT License - feel free to modify and use as needed.
