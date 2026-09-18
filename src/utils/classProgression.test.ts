import { isNextClass } from './classProgression';

test.each([['1', '2'], ['Class 1', 'Class 2'], ['1st', '2nd'], ['IX', 'X'], ['LKG', 'UKG'], ['UKG', '1']])('allows %s to %s', (source, destination) => {
  expect(isNextClass(source, destination)).toBe(true);
});

test.each([['1', '4'], ['1', '10'], ['1', '1'], ['4', '1'], ['UKG', '2'], ['Unknown', '1'], ['Class 1', 'Unknown']])('rejects %s to %s', (source, destination) => {
  expect(isNextClass(source, destination)).toBe(false);
});
