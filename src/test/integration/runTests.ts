import { ExTester } from 'vscode-extension-tester';

const tester = new ExTester();

tester.setupAndRunTests(undefined, 'out/test/integration/suite/**/*.test.js');
