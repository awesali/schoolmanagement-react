import { isValidClassName } from './className';

test.each(['1st', '2nd', '3rd', '6th', '6 th', '11th', '12th', '13th', '21st', 'Class 6th', 'Nursery', 'LKG', 'UKG'])('accepts %s', name => {
  expect(isValidClassName(name)).toBe(true);
});
test.each(['6', 'Class 1', '1th', '2st', '3th', '11st', '12nd', '13rd', '6th extra', '0th', ''])('rejects %s', name => {
  expect(isValidClassName(name)).toBe(false);
});
