import { useState } from 'react';
import { signupCreator, loginCreator, validatePasswordStrength, getPasswordStrength } from '../firebase/auth';

export default function CreatorLogin({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    firstName: '',
    lastName: '',
    username: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Form validation
  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!isLogin) {
      const passwordValidation = validatePasswordStrength(formData.password);
      if (!passwordValidation.isValid) {
        newErrors.password = passwordValidation.errors[0];
      }
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!isLogin) {
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }

      if (!formData.businessName) {
        newErrors.businessName = 'Business name is required';
      }

      if (!formData.firstName) {
        newErrors.firstName = 'First name is required';
      }

      if (!formData.lastName) {
        newErrors.lastName = 'Last name is required';
      }

      if (!formData.username) {
        newErrors.username = 'Username is required';
      } else if (!/^[a-zA-Z0-9]+$/.test(formData.username)) {
        newErrors.username = 'Username must be alphanumeric (no spaces)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'password' && !isLogin) {
      setPasswordStrength(getPasswordStrength(value));
    }

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    setAuthError('');
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setAuthError('');

    try {
      let result;

      if (isLogin) {
        result = await loginCreator(formData.email, formData.password);
      } else {
        result = await signupCreator(formData.email, formData.password, {
          businessName: formData.businessName,
          firstName: formData.firstName,
          lastName: formData.lastName,
          username: formData.username
        });
      }

      onAuthSuccess(result.creatorData);

    } catch (error) {
      setAuthError(error.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle between login and signup
  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      businessName: '',
      firstName: '',
      lastName: '',
      username: ''
    });
    setErrors({});
    setAuthError('');
    setPasswordStrength(0);
  };

  // Get password strength color
  const getPasswordStrengthColor = (strength) => {
    if (strength <= 1) return '#ef4444';
    if (strength <= 2) return '#f59e0b';
    if (strength <= 3) return '#eab308';
    return '#10b981';
  };

  // Get password strength text
  const getPasswordStrengthText = (strength) => {
    if (strength <= 1) return 'Very Weak';
    if (strength <= 2) return 'Weak';
    if (strength <= 3) return 'Fair';
    return 'Strong';
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-md">
        <div className="glass-card p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-white">
              {isLogin ? 'Creator Login' : 'Creator Sign Up'}
            </h2>
            <p className="text-white/60">
              {isLogin ? 'Sign in to access the creator tools' : 'Create your creator account'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {authError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-red-300 text-sm">
                {authError}
              </div>
            )}

            {!isLogin && (
              <>
                <div className="space-y-2">
                  <label htmlFor="firstName" className="block text-sm font-medium text-white/80">
                    First Name
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className={`glass-input w-full ${errors.firstName ? 'border-red-500/50' : ''}`}
                    placeholder="Enter your first name"
                  />
                  {errors.firstName && <p className="text-red-300 text-xs mt-1">{errors.firstName}</p>}
                </div>

                <div className="space-y-2">
                  <label htmlFor="lastName" className="block text-sm font-medium text-white/80">
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className={`glass-input w-full ${errors.lastName ? 'border-red-500/50' : ''}`}
                    placeholder="Enter your last name"
                  />
                  {errors.lastName && <p className="text-red-300 text-xs mt-1">{errors.lastName}</p>}
                </div>

                <div className="space-y-2">
                  <label htmlFor="businessName" className="block text-sm font-medium text-white/80">
                    Business Name
                  </label>
                  <input
                    type="text"
                    id="businessName"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleInputChange}
                    className={`glass-input w-full ${errors.businessName ? 'border-red-500/50' : ''}`}
                    placeholder="Enter your business name"
                  />
                  {errors.businessName && <p className="text-red-300 text-xs mt-1">{errors.businessName}</p>}
                </div>
              </>
            )}

            {!isLogin && (
              <div className="space-y-2">
                <label htmlFor="username" className="block text-sm font-medium text-white/80">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className={`glass-input w-full ${errors.username ? 'border-red-500/50' : ''}`}
                  placeholder="Choose a username"
                />
                {errors.username && <p className="text-red-300 text-xs mt-1">{errors.username}</p>}
                <p className="text-xs text-white/40">This will be your profile URL: domain.com/username</p>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-white/80">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`glass-input w-full ${errors.email ? 'border-red-500/50' : ''}`}
                placeholder="Enter your email"
              />
              {errors.email && <p className="text-red-300 text-xs mt-1">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-white/80">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`glass-input w-full ${errors.password ? 'border-red-500/50' : ''}`}
                placeholder="Enter your password"
              />
              {errors.password && <p className="text-red-300 text-xs mt-1">{errors.password}</p>}

              {!isLogin && formData.password && (
                <div className="space-y-2 mt-2">
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${(passwordStrength / 5) * 100}%`,
                        backgroundColor: getPasswordStrengthColor(passwordStrength)
                      }}
                    ></div>
                  </div>
                  <span
                    className="text-xs font-medium"
                    style={{ color: getPasswordStrengthColor(passwordStrength) }}
                  >
                    {getPasswordStrengthText(passwordStrength)}
                  </span>
                </div>
              )}
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-white/80">
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`glass-input w-full ${errors.confirmPassword ? 'border-red-500/50' : ''}`}
                  placeholder="Confirm your password"
                />
                {errors.confirmPassword && <p className="text-red-300 text-xs mt-1">{errors.confirmPassword}</p>}
              </div>
            )}

            <button
              type="submit"
              className="w-full btn-primary mt-6"
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          {/* Footer */}
          <div className="text-center pt-4 border-t border-white/10">
            <p className="text-white/60 text-sm">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button
                type="button"
                onClick={toggleMode}
                className="ml-2 text-purple-bright hover:text-purple-light font-medium transition-colors"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div >
  );
}
