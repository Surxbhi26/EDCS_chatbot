
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+?[0-9]{7,15}$/; // 7–15 digits, optional +

export const validateTicket = (data) => {
  const errors = {};
  if (!data.name?.trim()) errors.name = 'Name is required';
  if (!data.email?.trim()) errors.email = 'Email is required';
  else if (!emailRegex.test(data.email)) errors.email = 'Enter a valid email address';

  if (data.phone && data.phone.trim() && !phoneRegex.test(data.phone)) {
    errors.phone = 'Enter a valid phone number';
  }

  if (!data.category) errors.category = 'Category is required';
  if (!data.description?.trim()) errors.description = 'Question is required';

  return errors;
};

export const validateMeeting = (data) => {
  const errors = {};
  if (!data.name?.trim()) errors.name = 'Name is required';
  if (!data.email?.trim()) errors.email = 'Email is required';
  else if (!emailRegex.test(data.email)) errors.email = 'Enter a valid email address';

  if (!data.phone?.trim()) errors.phone = 'Phone number is required';
  else if (!phoneRegex.test(data.phone)) errors.phone = 'Enter a valid phone number';

  if (!data.purpose) errors.purpose = 'Meeting purpose is required';

  if (!data.date) errors.date = 'Preferred date is required';
  else if (new Date(data.date) < new Date(new Date().toDateString())) {
    errors.date = 'Date cannot be in the past';
  }

  if (!data.time) errors.time = 'Please select a preferred time slot';

  return errors;
};

export const validateTicketId = (ticketId) => {
  if (!ticketId.trim()) return 'Ticket ID is required';
  const ticketIdRegex = /^EDCS-\d{8}-\d{4}$/;
  if (!ticketIdRegex.test(ticketId)) {
    return 'Ticket ID must be in format EDCS-YYYYMMDD-XXXX';
  }
  return '';
};
