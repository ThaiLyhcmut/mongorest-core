#!/usr/bin/env ts-node

/**
 * Test runner script for the MongoRest Core
 * 
 * Usage:
 *   npm run test                    # Run all tests
 *   npm run test:watch             # Run tests in watch mode
 *   npm run test:coverage          # Run tests with coverage
 *   npm run test:unit              # Run only unit tests
 *   npm run test:integration       # Run only integration tests
 */

import { spawn } from 'child_process';
import * as path from 'path';

const ROOT_DIR = path.join(__dirname, '..');
const JEST_CONFIG = path.join(ROOT_DIR, 'jest.config.js');

interface TestOptions {
  watch?: boolean;
  coverage?: boolean;
  testPattern?: string;
  verbose?: boolean;
  silent?: boolean;
  updateSnapshots?: boolean;
  detectOpenHandles?: boolean;
}

class TestRunner {
  private rootDir: string;
  private jestConfig: string;

  constructor(rootDir: string, jestConfig: string) {
    this.rootDir = rootDir;
    this.jestConfig = jestConfig;
  }

  async runTests(options: TestOptions = {}): Promise<number> {
    const args = this.buildJestArgs(options);
    
    console.log('🧪 Running MongoRest Core Tests...');
    console.log(`📁 Root Directory: ${this.rootDir}`);
    console.log(`⚙️  Jest Config: ${this.jestConfig}`);
    console.log(`🚀 Command: jest ${args.join(' ')}\n`);

    return new Promise((resolve, reject) => {
      const jest = spawn('npx', ['jest', ...args], {
        cwd: this.rootDir,
        stdio: 'inherit',
        env: {
          ...process.env,
          NODE_ENV: 'test',
          FORCE_COLOR: '1'
        }
      });

      jest.on('close', (code) => {
        if (code === 0) {
          console.log('\n✅ All tests passed!');
        } else {
          console.log(`\n❌ Tests failed with exit code ${code}`);
        }
        resolve(code || 0);
      });

      jest.on('error', (error) => {
        console.error('❌ Failed to start test runner:', error);
        reject(error);
      });
    });
  }

  private buildJestArgs(options: TestOptions): string[] {
    const args: string[] = ['--config', this.jestConfig];

    if (options.watch) {
      args.push('--watch');
    }

    if (options.coverage) {
      args.push('--coverage');
    }

    if (options.verbose) {
      args.push('--verbose');
    }

    if (options.silent) {
      args.push('--silent');
    }

    if (options.updateSnapshots) {
      args.push('--updateSnapshot');
    }

    if (options.detectOpenHandles) {
      args.push('--detectOpenHandles');
    }

    if (options.testPattern) {
      args.push('--testNamePattern', options.testPattern);
    }

    return args;
  }

  async runUnitTests(): Promise<number> {
    console.log('🔬 Running Unit Tests...');
    return this.runTests({
      testPattern: '^((?!integration).)*$',
      verbose: true
    });
  }

  async runIntegrationTests(): Promise<number> {
    console.log('🔗 Running Integration Tests...');
    return this.runTests({
      testPattern: 'integration',
      verbose: true,
      detectOpenHandles: true
    });
  }

  async runCoverageReport(): Promise<number> {
    console.log('📊 Running Tests with Coverage Report...');
    return this.runTests({
      coverage: true,
      verbose: true
    });
  }

  async runWatchMode(): Promise<number> {
    console.log('👀 Running Tests in Watch Mode...');
    return this.runTests({
      watch: true,
      verbose: true
    });
  }
}

// Main execution
async function main() {
  const runner = new TestRunner(ROOT_DIR, JEST_CONFIG);
  const command = process.argv[2];

  try {
    let exitCode: number;

    switch (command) {
      case 'unit':
        exitCode = await runner.runUnitTests();
        break;
      case 'integration':
        exitCode = await runner.runIntegrationTests();
        break;
      case 'coverage':
        exitCode = await runner.runCoverageReport();
        break;
      case 'watch':
        exitCode = await runner.runWatchMode();
        break;
      case 'help':
        printHelp();
        exitCode = 0;
        break;
      default:
        exitCode = await runner.runTests({ verbose: true });
        break;
    }

    process.exit(exitCode);
  } catch (error) {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
🧪 MongoRest Core Test Runner

Usage:
  npm run test                    Run all tests
  npm run test:unit              Run only unit tests  
  npm run test:integration       Run only integration tests
  npm run test:coverage          Run tests with coverage report
  npm run test:watch             Run tests in watch mode

Options:
  help                           Show this help message

Examples:
  npm run test                   # Run all tests with verbose output
  npm run test:unit              # Run unit tests only
  npm run test:coverage          # Generate coverage report
  npm run test:watch             # Start watch mode for development

Test Structure:
  📁 test/
    ├── 🔬 unit tests (*.test.ts)
    ├── 🔗 integration.test.ts
    ├── 🎭 mocks/
    └── ⚙️  setup.ts

Coverage Reports:
  📊 HTML: coverage/lcov-report/index.html
  📄 Text: Console output
  📈 LCOV: coverage/lcov.info
`);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { TestRunner };