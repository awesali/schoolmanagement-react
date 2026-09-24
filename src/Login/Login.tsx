import React, { useState } from 'react';
import { useToastMessageState } from '../components/Toast/Toast';
import { LoadingButton } from '../components/Loader/Loader';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import './Login.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useToastMessageState('error');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'accept': '*/*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        if (data.schoolId) {
          localStorage.setItem('schoolId', data.schoolId.toString());
        }
        navigate('/dashboard');
      } else {
        const studentResponse = await fetch(`${API_BASE_URL}/api/StudentParentAuth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password }),
        });
        if (studentResponse.ok) {
          const result = await studentResponse.json();
          const token = result.data as string;
          const payload = JSON.parse(atob(token.split('.')[1]));
          const role = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || payload.RoleName;
          if (String(role).toLowerCase() !== 'student') throw new Error('This portal is for students only.');
          localStorage.setItem('token', token);
          localStorage.removeItem('schoolId');
          navigate('/student');
        } else {
          setError('Invalid email or password.');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="card login-card">
        <h1>Login</h1>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="error">{error}</div>}
          <LoadingButton type="submit" className="btn btn-primary" loading={loading} loadingText="Logging in...">
            Login
          </LoadingButton>
        </form>
      </div>
    </div>
  );
};

export default Login;


