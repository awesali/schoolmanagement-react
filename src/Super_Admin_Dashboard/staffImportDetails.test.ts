import { parseStaffDetailColumns, staffTemplateHeaders, staffTemplateExample } from './staffImportDetails';
test('template imports primary and multiple details including later numbered records', () => {
  const row = Object.fromEntries(staffTemplateHeaders.map((key, i) => [key, staffTemplateExample[i]]));
  row.CertificationName3 = 'Safety'; row.CertificationDate3 = '7/1/2021';
  const result = parseStaffDetailColumns(row);
  expect(result.errors).toEqual([]);
  expect(result.payload.PinCode).toBe('444601');
  expect(result.payload.ExperienceFrom).toBe('2015-04-01');
  const additional = JSON.parse(result.payload.AdditionalDetails);
  expect(additional['Educational Details'][0].qualification).toBe('M.Ed');
  expect(additional['Certification Details'][0].certificationDate).toBe('2021-07-01');
});
test('legacy columns remain optional and invalid additional dates produce row errors', () => {
  expect(parseStaffDetailColumns({ Address: 'Street' }).errors).toEqual([]);
  expect(parseStaffDetailColumns({ CertificationDate2: '31/12/2020' }).errors[0]).toMatch(/CertificationDate2/);
  expect(parseStaffDetailColumns({ PassingYear2: '1800' }).errors[0]).toMatch(/Educational Details 2/);
});
