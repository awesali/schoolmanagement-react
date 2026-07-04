export interface AuthTokenPayload {
  roleId: string | null;
  schoolId: number | null;
  name: string | null;
}

export const getAuthTokenPayload = (): AuthTokenPayload | null => {
  const token = localStorage.getItem('token');
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const schoolId = payload['SchoolId'] || payload['schoolId'] || payload['school_id'];

    return {
      roleId: payload['RoleId'] || null,
      schoolId: schoolId ? Number(schoolId) : null,
      name: payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || null,
    };
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

export const getTeacherSchoolId = () => {
  const payload = getAuthTokenPayload();
  return payload?.roleId === '2' ? payload.schoolId : null;
};
