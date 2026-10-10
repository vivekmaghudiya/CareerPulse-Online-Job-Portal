// Online Job Portal - Client Interactivity & Validation System

document.addEventListener('DOMContentLoaded', () => {
  // 1. Bootstrap Alerts Auto-dismiss after 6 seconds
  const alerts = document.querySelectorAll('.alert-dismissible');
  alerts.forEach(alert => {
    setTimeout(() => {
      try {
        const bsAlert = new bootstrap.Alert(alert);
        bsAlert.close();
      } catch (e) {
        alert.remove();
      }
    }, 6000);
  });

  // Standard Email Regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  // Helper: set field invalid with clear message
  const setInvalid = (inputEl, feedbackEl, message) => {
    if (inputEl) {
      inputEl.classList.add('is-invalid');
      inputEl.classList.remove('is-valid');
    }
    if (feedbackEl) {
      feedbackEl.textContent = message;
      feedbackEl.style.display = 'block';
    }
  };

  // Helper: clear field invalid status
  const clearInvalid = (inputEl, feedbackEl) => {
    if (inputEl) {
      inputEl.classList.remove('is-invalid');
    }
    if (feedbackEl) {
      feedbackEl.textContent = '';
      feedbackEl.style.display = '';
    }
  };

  // Helper: setup password visibility toggle button
  const setupPasswordToggle = (toggleBtnId, targetInputId) => {
    const btn = document.getElementById(toggleBtnId);
    const input = document.getElementById(targetInputId);
    if (btn && input) {
      btn.addEventListener('click', () => {
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        const icon = btn.querySelector('i');
        if (icon) {
          if (isPassword) {
            icon.classList.remove('bi-eye');
            icon.classList.add('bi-eye-slash');
          } else {
            icon.classList.remove('bi-eye-slash');
            icon.classList.add('bi-eye');
          }
        }
      });
    }
  };

  // =========================================================================
  // 2. LOGIN FORM VALIDATION & INTERACTIVITY
  // =========================================================================
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const emailFeedback = document.getElementById('emailFeedback');
    const passwordFeedback = document.getElementById('passwordFeedback');
    const submitBtn = document.getElementById('loginSubmitBtn');
    const btnText = document.getElementById('loginBtnText');
    const btnSpinner = document.getElementById('loginBtnSpinner');

    // Track user manual interaction to never wipe user input
    let hasUserInteracted = false;
    ['focus', 'keydown', 'mousedown', 'touchstart', 'input'].forEach(evt => {
      if (emailInput) emailInput.addEventListener(evt, () => { hasUserInteracted = true; });
      if (passwordInput) passwordInput.addEventListener(evt, () => { hasUserInteracted = true; });
    });

    // Enforce empty email and password fields on initial page load
    const enforceEmptyFields = () => {
      if (!hasUserInteracted) {
        if (emailInput && emailInput.value) {
          emailInput.value = '';
        }
        if (passwordInput && passwordInput.value) {
          passwordInput.value = '';
        }
      }
    };

    // Execute immediately and on staggered intervals to neutralize delayed browser autofill injection
    enforceEmptyFields();
    setTimeout(enforceEmptyFields, 50);
    setTimeout(enforceEmptyFields, 150);
    setTimeout(enforceEmptyFields, 300);
    window.addEventListener('pageshow', enforceEmptyFields);

    // Real-time clearance of errors on user input
    if (emailInput) {
      emailInput.addEventListener('input', () => {
        const val = emailInput.value.trim();
        if (val && emailRegex.test(val)) {
          clearInvalid(emailInput, emailFeedback);
        } else if (!emailInput.value) {
          clearInvalid(emailInput, emailFeedback);
        }
      });
    }

    if (passwordInput) {
      passwordInput.addEventListener('input', () => {
        if (passwordInput.value && passwordInput.value.trim().length > 0) {
          clearInvalid(passwordInput, passwordFeedback);
        }
      });
    }

    // Initialize password visibility toggle
    setupPasswordToggle('toggleLoginPassword', 'password');

    loginForm.addEventListener('submit', (e) => {
      let isValid = true;
      let firstInvalidEl = null;

      const rawEmail = emailInput ? emailInput.value : '';
      const emailVal = rawEmail.trim();
      const rawPassword = passwordInput ? passwordInput.value : '';

      // 1. Email validation
      if (!rawEmail || emailVal.length === 0) {
        setInvalid(emailInput, emailFeedback, 'Email address is required.');
        isValid = false;
        if (!firstInvalidEl) firstInvalidEl = emailInput;
      } else if (!emailRegex.test(emailVal)) {
        setInvalid(emailInput, emailFeedback, 'Please provide a valid email address.');
        isValid = false;
        if (!firstInvalidEl) firstInvalidEl = emailInput;
      } else {
        clearInvalid(emailInput, emailFeedback);
      }

      // 2. Password validation (cannot be empty or whitespace-only)
      if (!rawPassword || rawPassword.trim().length === 0) {
        setInvalid(passwordInput, passwordFeedback, 'Password is required and cannot be only whitespace.');
        isValid = false;
        if (!firstInvalidEl) firstInvalidEl = passwordInput;
      } else {
        clearInvalid(passwordInput, passwordFeedback);
      }

      if (!isValid) {
        e.preventDefault();
        if (firstInvalidEl) {
          firstInvalidEl.focus();
        }
        return false;
      }

      // Show loading state while submitting
      if (submitBtn) {
        submitBtn.disabled = true;
        if (btnText) btnText.classList.add('d-none');
        if (btnSpinner) btnSpinner.classList.remove('d-none');
      }
    });
  }

  // =========================================================================
  // 3. REGISTRATION FORM VALIDATION & INTERACTIVITY
  // =========================================================================
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    const roleSelect = document.getElementById('role');
    const companyWrapper = document.getElementById('companyNameWrapper');
    const companyInput = document.getElementById('companyName');
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const agreeTermsInput = document.getElementById('agreeTerms');

    const roleFeedback = document.getElementById('roleFeedback');
    const nameFeedback = document.getElementById('nameFeedback');
    const companyFeedback = document.getElementById('companyFeedback');
    const emailFeedback = document.getElementById('emailFeedback');
    const passwordFeedback = document.getElementById('passwordFeedback');
    const confirmPasswordFeedback = document.getElementById('confirmPasswordFeedback');
    const termsFeedback = document.getElementById('termsFeedback');

    const submitBtn = document.getElementById('registerSubmitBtn');
    const btnText = document.getElementById('registerBtnText');
    const btnSpinner = document.getElementById('registerBtnSpinner');

    // Dynamic Employer / Job Seeker fields toggle
    const handleRoleChange = () => {
      if (!roleSelect || !companyWrapper) return;
      if (roleSelect.value === 'employer') {
        companyWrapper.style.display = 'block';
        if (companyInput) companyInput.required = true;
      } else {
        companyWrapper.style.display = 'none';
        if (companyInput) {
          companyInput.required = false;
          clearInvalid(companyInput, companyFeedback);
        }
      }
      if (roleSelect.value) {
        clearInvalid(roleSelect, roleFeedback);
      }
    };

    if (roleSelect) {
      roleSelect.addEventListener('change', handleRoleChange);
      handleRoleChange(); // Initial check on load
    }

    // Real-time error clearance
    if (nameInput) {
      nameInput.addEventListener('input', () => {
        const val = nameInput.value.trim();
        if (val.length >= 2 && val.length <= 70) {
          clearInvalid(nameInput, nameFeedback);
        }
      });
    }

    if (companyInput) {
      companyInput.addEventListener('input', () => {
        const val = companyInput.value.trim();
        if (val.length >= 2 && val.length <= 100) {
          clearInvalid(companyInput, companyFeedback);
        }
      });
    }

    if (emailInput) {
      emailInput.addEventListener('input', () => {
        const val = emailInput.value.trim();
        if (val && emailRegex.test(val)) {
          clearInvalid(emailInput, emailFeedback);
        }
      });
    }

    // Password strength evaluator and criteria updater
    const evaluatePasswordStrength = (pass) => {
      if (!pass) {
        return {
          score: 0,
          lengthMet: false,
          upperMet: false,
          lowerMet: false,
          numMet: false,
          specialMet: false,
          isStrong: false
        };
      }
      const lengthMet = pass.length >= 6;
      const upperMet = /[A-Z]/.test(pass);
      const lowerMet = /[a-z]/.test(pass);
      const numMet = /[0-9]/.test(pass);
      const specialMet = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pass);

      let score = 0;
      if (lengthMet) score++;
      if (upperMet) score++;
      if (lowerMet) score++;
      if (numMet) score++;
      if (specialMet) score++;

      const isStrong = lengthMet && upperMet && lowerMet && numMet && specialMet;

      return {
        score,
        lengthMet,
        upperMet,
        lowerMet,
        numMet,
        specialMet,
        isStrong
      };
    };

    const updateCriterion = (elementId, isMet) => {
      const el = document.getElementById(elementId);
      if (!el) return;
      const icon = el.querySelector('i');
      const label = el.querySelector('span');
      if (isMet) {
        if (icon) {
          icon.className = 'bi bi-check-circle-fill text-success';
        }
        if (label) {
          label.classList.add('text-success', 'fw-medium');
          label.classList.remove('text-muted');
        }
      } else {
        if (icon) {
          icon.className = 'bi bi-dash-circle text-muted';
        }
        if (label) {
          label.classList.remove('text-success', 'fw-medium');
          label.classList.add('text-muted');
        }
      }
    };

    const updateStrengthMeterUI = (evalResult, valLength) => {
      const labelEl = document.getElementById('passwordStrengthLabel');
      const barEl = document.getElementById('passwordStrengthBar');
      if (!labelEl || !barEl) return;

      updateCriterion('critLength', evalResult.lengthMet);
      updateCriterion('critUpper', evalResult.upperMet);
      updateCriterion('critLower', evalResult.lowerMet);
      updateCriterion('critNumber', evalResult.numMet);
      updateCriterion('critSpecial', evalResult.specialMet);

      if (valLength === 0) {
        labelEl.textContent = 'Enter password';
        labelEl.className = 'small fw-bold text-muted';
        barEl.style.width = '0%';
        barEl.className = 'progress-bar transition-all';
        barEl.setAttribute('aria-valuenow', '0');
        return;
      }

      const { score } = evalResult;
      barEl.classList.remove('bg-danger', 'bg-warning', 'bg-info', 'bg-success');

      if (score <= 2) {
        labelEl.textContent = 'Weak';
        labelEl.className = 'small fw-bold text-danger';
        barEl.style.width = `${Math.max(score * 20, 20)}%`;
        barEl.classList.add('bg-danger');
        barEl.setAttribute('aria-valuenow', `${Math.max(score * 20, 20)}`);
      } else if (score === 3) {
        labelEl.textContent = 'Fair';
        labelEl.className = 'small fw-bold text-warning';
        barEl.style.width = '60%';
        barEl.classList.add('bg-warning');
        barEl.setAttribute('aria-valuenow', '60');
      } else if (score === 4) {
        labelEl.textContent = 'Good';
        labelEl.className = 'small fw-bold text-info';
        barEl.style.width = '80%';
        barEl.classList.add('bg-info');
        barEl.setAttribute('aria-valuenow', '80');
      } else {
        labelEl.textContent = 'Strong';
        labelEl.className = 'small fw-bold text-success';
        barEl.style.width = '100%';
        barEl.classList.add('bg-success');
        barEl.setAttribute('aria-valuenow', '100');
      }
    };

    // Initialize password visibility toggles
    setupPasswordToggle('toggleRegPassword', 'password');
    setupPasswordToggle('toggleRegConfirmPassword', 'confirmPassword');

    if (passwordInput) {
      passwordInput.addEventListener('input', () => {
        const val = passwordInput.value;
        const evalResult = evaluatePasswordStrength(val);
        updateStrengthMeterUI(evalResult, val.length);

        if (val && val.trim().length >= 6 && evalResult.isStrong) {
          clearInvalid(passwordInput, passwordFeedback);
        }
        if (confirmPasswordInput && confirmPasswordInput.value) {
          if (confirmPasswordInput.value === passwordInput.value) {
            clearInvalid(confirmPasswordInput, confirmPasswordFeedback);
          }
        }
      });
      // Initial state sync if field has value
      if (passwordInput.value) {
        updateStrengthMeterUI(evaluatePasswordStrength(passwordInput.value), passwordInput.value.length);
      }
    }

    if (confirmPasswordInput) {
      confirmPasswordInput.addEventListener('input', () => {
        if (confirmPasswordInput.value === passwordInput.value) {
          clearInvalid(confirmPasswordInput, confirmPasswordFeedback);
        }
      });
    }

    if (agreeTermsInput) {
      agreeTermsInput.addEventListener('change', () => {
        if (agreeTermsInput.checked) {
          clearInvalid(agreeTermsInput, termsFeedback);
        }
      });
    }

    registerForm.addEventListener('submit', (e) => {
      let isValid = true;
      let firstInvalidEl = null;

      // 1. Account Type (Role) Validation
      const roleVal = roleSelect ? roleSelect.value : '';
      if (!roleVal || (roleVal !== 'job_seeker' && roleVal !== 'employer')) {
        setInvalid(roleSelect, roleFeedback, 'Please select a valid account type (Job Seeker or Employer).');
        isValid = false;
        if (!firstInvalidEl) firstInvalidEl = roleSelect;
      } else {
        clearInvalid(roleSelect, roleFeedback);
      }

      // 2. Full Name Validation (not empty, not whitespace-only, 2-70 chars)
      const rawName = nameInput ? nameInput.value : '';
      const nameVal = rawName.trim();
      if (!rawName || nameVal.length === 0) {
        setInvalid(nameInput, nameFeedback, 'Full name is required and cannot be only whitespace.');
        isValid = false;
        if (!firstInvalidEl) firstInvalidEl = nameInput;
      } else if (nameVal.length < 2) {
        setInvalid(nameInput, nameFeedback, 'Full name must be at least 2 characters long.');
        isValid = false;
        if (!firstInvalidEl) firstInvalidEl = nameInput;
      } else if (nameVal.length > 70) {
        setInvalid(nameInput, nameFeedback, 'Full name cannot exceed 70 characters.');
        isValid = false;
        if (!firstInvalidEl) firstInvalidEl = nameInput;
      } else {
        clearInvalid(nameInput, nameFeedback);
      }

      // 3. Company Name Validation (only if employer)
      if (roleVal === 'employer') {
        const rawComp = companyInput ? companyInput.value : '';
        const compVal = rawComp.trim();
        if (!rawComp || compVal.length === 0) {
          setInvalid(companyInput, companyFeedback, 'Company name is required for Employer accounts.');
          isValid = false;
          if (!firstInvalidEl) firstInvalidEl = companyInput;
        } else if (compVal.length < 2) {
          setInvalid(companyInput, companyFeedback, 'Company name must be at least 2 characters long.');
          isValid = false;
          if (!firstInvalidEl) firstInvalidEl = companyInput;
        } else if (compVal.length > 100) {
          setInvalid(companyInput, companyFeedback, 'Company name cannot exceed 100 characters.');
          isValid = false;
          if (!firstInvalidEl) firstInvalidEl = companyInput;
        } else {
          clearInvalid(companyInput, companyFeedback);
        }
      }

      // 4. Email Validation
      const rawEmail = emailInput ? emailInput.value : '';
      const emailVal = rawEmail.trim();
      if (!rawEmail || emailVal.length === 0) {
        setInvalid(emailInput, emailFeedback, 'Email address is required.');
        isValid = false;
        if (!firstInvalidEl) firstInvalidEl = emailInput;
      } else if (!emailRegex.test(emailVal)) {
        setInvalid(emailInput, emailFeedback, 'Please provide a valid email address.');
        isValid = false;
        if (!firstInvalidEl) firstInvalidEl = emailInput;
      } else {
        clearInvalid(emailInput, emailFeedback);
      }

      // 5. Strong Password Validation (not empty, min 6 chars, uppercase, lowercase, number, special char)
      const passVal = passwordInput ? passwordInput.value : '';
      const passEval = evaluatePasswordStrength(passVal);
      if (!passVal || passVal.trim().length === 0) {
        setInvalid(passwordInput, passwordFeedback, 'Password is required and cannot be only whitespace.');
        isValid = false;
        if (!firstInvalidEl) firstInvalidEl = passwordInput;
      } else if (passVal.length < 6) {
        setInvalid(passwordInput, passwordFeedback, 'Password must be at least 6 characters long.');
        isValid = false;
        if (!firstInvalidEl) firstInvalidEl = passwordInput;
      } else if (!passEval.isStrong) {
        setInvalid(passwordInput, passwordFeedback, 'Password must be strong: include uppercase, lowercase, numbers, and special characters.');
        isValid = false;
        if (!firstInvalidEl) firstInvalidEl = passwordInput;
      } else {
        clearInvalid(passwordInput, passwordFeedback);
      }

      // 6. Confirm Password Validation
      const confirmVal = confirmPasswordInput ? confirmPasswordInput.value : '';
      if (!confirmVal) {
        setInvalid(confirmPasswordInput, confirmPasswordFeedback, 'Please confirm your password.');
        isValid = false;
        if (!firstInvalidEl) firstInvalidEl = confirmPasswordInput;
      } else if (confirmVal !== passVal) {
        setInvalid(confirmPasswordInput, confirmPasswordFeedback, 'Passwords do not match.');
        isValid = false;
        if (!firstInvalidEl) firstInvalidEl = confirmPasswordInput;
      } else {
        clearInvalid(confirmPasswordInput, confirmPasswordFeedback);
      }

      // 7. Terms Agreement Validation
      if (agreeTermsInput && !agreeTermsInput.checked) {
        setInvalid(agreeTermsInput, termsFeedback, 'You must agree to the Terms of Service to continue.');
        isValid = false;
        if (!firstInvalidEl) firstInvalidEl = agreeTermsInput;
      } else if (agreeTermsInput) {
        clearInvalid(agreeTermsInput, termsFeedback);
      }

      if (!isValid) {
        e.preventDefault();
        if (firstInvalidEl) {
          firstInvalidEl.focus();
        }
        return false;
      }

      // Show loading state while submitting
      if (submitBtn) {
        submitBtn.disabled = true;
        if (btnText) btnText.classList.add('d-none');
        if (btnSpinner) btnSpinner.classList.remove('d-none');
      }
    });
  }

  // =========================================================================
  // 4. RESUME UPLOAD VALIDATION (5MB CAP)
  // =========================================================================
  const resumeInput = document.getElementById('resume');
  if (resumeInput) {
    resumeInput.addEventListener('change', function () {
      if (this.files && this.files[0]) {
        const file = this.files[0];
        const maxSize = 5 * 1024 * 1024; // 5 MB
        if (file.size > maxSize) {
          alert('File size exceeds the 5MB limit. Please upload a smaller file.');
          this.value = '';
        }
      }
    });
  }
});
