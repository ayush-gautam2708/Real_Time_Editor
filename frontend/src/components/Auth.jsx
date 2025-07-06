import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react'; // optional icons, or replace with your own

const Auth = () => {
  const [isSignup, setIsSignup] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();

  const toggleMode = () => {
    setIsSignup(prev => !prev);
    setForm({ username: '', password: '', confirmPassword: '' });
  };

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSignup && form.password !== form.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    const endpoint = isSignup ? '/signup' : '/signin';

    try {
      const res = await fetch(`http://localhost:5000/api/auth${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');

      alert(data.message || 'Success');
      if (isSignup) {
        alert('Account created successfully!');
        setIsSignup(false);
      } else if (data.token) {
        localStorage.setItem('token', data.token);
        navigate('/home');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100 px-4">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {isSignup ? 'Sign Up' : 'Sign In'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={form.username}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword(prev => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {isSignup && (
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                name="confirmPassword"
                placeholder="Confirm Password"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(prev => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600"
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition duration-200"
          >
            {isSignup ? 'Create Account' : 'Login'}
          </button>
        </form>
        <p className="text-sm text-center mt-4">
          {isSignup ? 'Already have an account?' : "Don't have an account?"}
          <button
            type="button"
            onClick={toggleMode}
            className="text-blue-600 hover:underline ml-1"
          >
            {isSignup ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;
