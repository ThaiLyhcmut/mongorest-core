# Publishing @mongorest/core to NPM

## Prerequisites

1. Create an npm account at https://www.npmjs.com/
2. Login to npm CLI:
   ```bash
   npm login
   ```

## Before Publishing

1. Update package.json with your information:
   - Change `author` field to your name
   - Update `repository.url` to your GitHub repository
   - Update `bugs.url` to your issue tracker
   - Update `homepage` to your documentation site

2. Choose a unique package name if `@mongorest/core` is taken:
   - Option 1: Use your npm username: `@yourusername/mongorest-core`
   - Option 2: Use a different name: `mongorest-framework`

3. Test the package locally:
   ```bash
   npm run build
   npm pack
   # This creates a .tgz file you can test install
   ```

## Publishing Steps

1. Clean and rebuild:
   ```bash
   npm run clean
   npm run build
   ```

2. Test the package:
   ```bash
   npm test  # If you have tests
   ```

3. Update version (if needed):
   ```bash
   npm version patch  # or minor/major
   ```

4. Publish to npm:
   ```bash
   npm publish --access public
   ```

## After Publishing

Users can install your package with:
```bash
npm install @mongorest/core
```

## Maintenance

1. For updates, increment version:
   ```bash
   npm version patch  # 1.0.0 -> 1.0.1
   npm version minor  # 1.0.0 -> 1.1.0
   npm version major  # 1.0.0 -> 2.0.0
   ```

2. Rebuild and republish:
   ```bash
   npm run build
   npm publish
   ```

## Package Structure

Your published package includes:
- `dist/` - Compiled JavaScript and TypeScript declarations
- `README.md` - Documentation
- `LICENSE` - MIT License
- `package.json` - Package metadata

## Tips

1. Use semantic versioning (semver)
2. Update README.md for each release
3. Tag releases in git:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
4. Consider using npm scripts for release automation
5. Monitor npm download statistics at https://www.npmjs.com/package/@mongorest/core