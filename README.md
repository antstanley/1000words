# 1000 Words

Write 1000 words and share it with the world. A place for you to share your stories with the world.

Stories must be written by humans, no more than 1000 words, no less than 950 words. Just your stories, real or fiction, in your words.

### Technical Details

- Web
 - Reader interface to allow people to read the stories
    - Clean design using a serif font on an off white background
 - Editor interface. WYSIWG type editor interface, supporting inline markdown

- Storage
  - Stories are markdown files stored in s3 compatible storage
  - Storage backends should be pluggable

- Indexes
  - Story locations and metadata are stored in either SQLite, Postgres or DynamoFB
  - Index backends should be plugable

- Authentication
    - Uses Atproto Oauth implementation for authentication

- Tech stack
    - Svelte 5
    - Tailwindcss 4
    - Typescript

    Platform
    - Be able to be run in AWS or Cloudflare

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Type check
npm run check
```
