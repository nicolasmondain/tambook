# tambook

**Talk to your design system.**

A Storybook addon, powered by [Tambo](https://tambo.co), that automatically detects all your React components.

Just tell your design system what you need:

- *Show me a primary button with a loading state.*
- *Create a card with an image, title, and two actions.*
- *Display a modal with a destructive confirmation.*

Tambook understands your components, reads your Storybook setup, and renders the right combination instantly.

<table>
  <tr>
    <td><img src="assets/tambook-demo.png" alt="Tambook Button Demo" /></td>
    <td><img src="assets/tambook-demo-card.png" alt="Tambook Card Demo" /></td>
  </tr>
  <tr>
    <td colspan="2"><img src="assets/tambook-demo-nested.png" alt="Tambook Nested Components" /></td>
  </tr>
</table>

## Try It

```bash
git clone https://github.com/your-username/tambook.git
cd tambook
npm install
npm run example:install
```

Add your API key (get one free at [tambo.co](https://tambo.co)):

```bash
echo "STORYBOOK_TAMBO_API_KEY=your-api-key" > examples/storybook-demo/.env
```

Run Storybook:

```bash
npm run example:storybook
```

Open http://localhost:6006 and find the **Tambook** panel.

## License

MIT
