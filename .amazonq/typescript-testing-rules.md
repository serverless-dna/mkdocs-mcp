# TypeScript Testing Rules for AI Agents

## Test-First Approach
- Always write tests first following Test-Driven Development principles
- Tests serve as specification documents for the code
- Each test should be written before the implementation code

## Test File Organization
- Place test files in the same folder as the code being tested
- NEVER create a separate "tests" folder
- Name test files with the same name as the source file plus `.spec.ts` suffix
  - Example: For `WebSocketClient.ts`, the test file should be `WebSocketClient.spec.ts`

## Test Structure
- Use Jest as the testing framework
- Organize tests using nested `describe` blocks for each component
- Prefix every feature with `[Feature-Name]`, e.g., `[WebSocket-Connector] When an event is received`
- Format `describe` blocks with behavioral "When \<action\>" pattern
- Write `it` blocks with behavioral "should" statements
- Place all `it` blocks inside appropriate `describe` blocks
- Never use top-level `it` blocks
- Ensure `it` tests are inserted in-line within their parent `describe` blocks

### Example of Correct Test Structure:
```typescript
// CORRECT:
describe('[Calculator] When using the addition feature', () => {
  it('should correctly add two positive numbers', () => {
    // test implementation
  });
  
  it('should handle negative numbers', () => {
    // test implementation
  });
});

// INCORRECT:
it('should add two numbers', () => {
  // This is a top-level it block - not allowed
});
```

## Test Descriptions
- Use descriptive, behavior-focused language
- Tests should effectively document specifications

### Example of Good Test Descriptions:
```typescript
// GOOD:
describe('[Authentication] When a user attempts to authenticate', () => {
  it('should reject login attempts with invalid credentials', () => {
    // test implementation
  });
  
  it('should grant access with valid credentials', () => {
    // test implementation
  });
});

// BAD:
describe('Authentication', () => {
  it('invalid login fails', () => {
    // test implementation
  });
});
```

## Specification-Driven Development
- Tests act as living documentation of the code's behavior
- When tests fail, focus on fixing the code to match the tests, not vice versa
- The tests are the specification, so don't modify them to suit the code
- Tests should describe what the code should do, not how it does it

## Process Sequence
1. Run linting first (`npm run lint:fix` to auto-fix when possible)
2. Build the code to verify compilation
3. Run tests to verify functionality and coverage

## Linting
- Linting must be run before tests
- Start with `npm run lint:fix` to automatically fix some lint errors
- All remaining linting errors must be manually resolved

## Test Coverage Requirements
- Maintain 100% test coverage for all code
- No exceptions to the coverage rule
- NEVER adjust coverage rules to less than 100% for any reason
- When working on test coverage, only add new tests without modifying existing tests

## Definition of Done
- No linting warnings or errors
- Successful build with no errors or warnings
- All tests passing with no warnings or errors
- 100% test coverage for ALL files