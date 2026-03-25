const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const phoneRegex = /^\d{10}$/;

export function validateTicket(data = {}) {
  console.log('validateTicket called with:', data);
  const errors = {};

  if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
    errors.name = 'Name is required.';
  }

  if (!data.email || typeof data.email !== 'string' || data.email.trim() === '') {
    errors.email = 'Email is required.';
  } else if (!emailRegex.test(data.email.trim())) {
    errors.email = 'Please enter a valid email address.';
  }

  if (!data.category || typeof data.category !== 'string' || data.category.trim() === '') {
    errors.category = 'Category is required.';
  }

  if (!data.department) {
    errors.department = 'Please select a department';
  }

  if (!data.description || typeof data.description !== 'string' || data.description.trim().length < 10) {
    errors.description = 'Description must be at least 10 characters.';
  }

  if (!data.preferred_date || typeof data.preferred_date !== 'string' || data.preferred_date.trim() === '') {
    errors.preferred_date = 'Preferred date is required.';
  } else {
    const inputDate = new Date(data.preferred_date);
    const today = new Date();
    const inputOnly = new Date(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (!(inputDate instanceof Date) || isNaN(inputDate.getTime())) {
      errors.preferred_date = 'Please enter a valid date.';
    } else if (inputOnly < todayOnly) {
      errors.preferred_date = 'Date must be today or later.';
    }
  }

  if (!data.preferred_time || typeof data.preferred_time !== 'string' || data.preferred_time.trim() === '') {
    errors.preferred_time = 'Preferred time is required.';
  }

  if (data.phone && String(data.phone).trim() !== '') {
    const phoneStr = String(data.phone).trim();
    if (!phoneRegex.test(phoneStr)) {
      errors.phone = 'Phone must be exactly 10 digits.';
    }
  }

  console.log('errors found:', errors);
  return errors;
}

export function validateMeeting(data = {}) {
  console.log('validateMeeting called with:', data);
  const errors = {};

  if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
    errors.name = 'Name is required.';
  }

  if (!data.email || typeof data.email !== 'string' || data.email.trim() === '') {
    errors.email = 'Email is required.';
  } else if (!emailRegex.test(data.email.trim())) {
    errors.email = 'Please enter a valid email address.';
  }

  const phoneStr = data.phone != null ? String(data.phone).trim() : '';
  if (phoneStr === '') {
    errors.phone = 'Phone is required.';
  } else if (!phoneRegex.test(phoneStr)) {
    errors.phone = 'Phone must be exactly 10 digits.';
  }

  if (!data.purpose || typeof data.purpose !== 'string' || data.purpose.trim() === '') {
    errors.purpose = 'Purpose is required.';
  }

  if (!data.department) {
    errors.department = 'Please select a department';
  }

  if (!data.date || typeof data.date !== 'string' || data.date.trim() === '') {
    errors.date = 'Date is required.';
  } else {
    const inputDate = new Date(data.date);
    const today = new Date();
    // Normalize to date-only comparison
    const inputOnly = new Date(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (!(inputDate instanceof Date) || isNaN(inputDate.getTime())) {
      errors.date = 'Please enter a valid date.';
    } else if (inputOnly < todayOnly) {
      errors.date = 'Date must be today or later.';
    }
  }

  if (!data.time || typeof data.time !== 'string' || data.time.trim() === '') {
    errors.time = 'Time is required.';
  }

  console.log('errors found:', errors);
  return errors;
}

export function validateTicketId(id) {
  if (!id || typeof id !== 'string') {
    return 'Ticket ID is required.';
  }

  const trimmed = id.trim();
  const pattern = /^EDCS-\d{8}-\d{4}$/;

  if (!pattern.test(trimmed)) {
    return 'Ticket ID must be in the format EDCS-YYYYMMDD-XXXX.';
  }

  return null;
}
