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
    lastName: ''
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
        newErrors.password = passwordValidation.errors[0]; // Show first error
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
    
    // Update password strength for signup
    if (name === 'password' && !isLogin) {
      setPasswordStrength(getPasswordStrength(value));
    }
    
    // Clear error when user starts typing
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
          lastName: formData.lastName
        });
      }
      
      // On success, call the parent callback
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
      lastName: ''
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
    <div className="creator-login">
      <div className="auth-card">
        <div className="auth-header">
          <h2>{isLogin ? 'Creator Login' : 'Creator Sign Up'}</h2>
          <p>{isLogin ? 'Sign in to access the creator tools' : 'Create your creator account'}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {authError && (
            <div className="error-message auth-error">
              {authError}
            </div>
          )}

          {!isLogin && (
            <>
              <div className="form-group">
                <label htmlFor="firstName">First Name</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className={errors.firstName ? 'error' : ''}
                  placeholder="Enter your first name"
                />
                {errors.firstName && <span className="error-text">{errors.firstName}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="lastName">Last Name</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className={errors.lastName ? 'error' : ''}
                  placeholder="Enter your last name"
                />
                {errors.lastName && <span className="error-text">{errors.lastName}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="businessName">Business Name</label>
                <input
                  type="text"
                  id="businessName"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleInputChange}
                  className={errors.businessName ? 'error' : ''}
                  placeholder="Enter your business name"
                />
                {errors.businessName && <span className="error-text">{errors.businessName}</span>}
              </div>
            </>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={errors.email ? 'error' : ''}
              placeholder="Enter your email"
            />
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className={errors.password ? 'error' : ''}
              placeholder="Enter your password"
            />
            {errors.password && <span className="error-text">{errors.password}</span>}
            
            {!isLogin && formData.password && (
              <div className="password-strength">
                <div className="strength-bar">
                  <div 
                    className="strength-fill" 
                    style={{ 
                      width: `${(passwordStrength / 5) * 100}%`,
                      backgroundColor: getPasswordStrengthColor(passwordStrength)
                    }}
                  ></div>
                </div>
                <span 
                  className="strength-text"
                  style={{ color: getPasswordStrengthColor(passwordStrength) }}
                >
                  {getPasswordStrengthText(passwordStrength)}
                </span>
              </div>
            )}
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={errors.confirmPassword ? 'error' : ''}
                placeholder="Confirm your password"
              />
              {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
            </div>
          )}

          <button 
            type="submit" 
            className="btn-auth"
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button type="button" onClick={toggleMode} className="link-button">
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
