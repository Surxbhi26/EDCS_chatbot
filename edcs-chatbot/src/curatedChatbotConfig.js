export const curatedCareersMenu = {
  message: 'Careers: Select an option to learn more.',
  options: [
    { id: 'car1', text: 'Open roles and hiring process.', action: 'answer' },
    { id: 'car2', text: 'Internships and fresher opportunities.', action: 'answer' },
    { id: 'car3', text: 'How to submit your resume.', action: 'answer' },
  ],
};

export const curatedCareersAnswers = {
  car1:
    'Open Roles & Hiring:\n\nWe hire across SAP, Oracle, and Managed IT roles depending on current openings.\n\nSubmit a query with your preferred date/time and our HR team will get back to you.',
  car2:
    'Internships & Freshers:\n\nWe consider internships and fresher profiles based on requirements.\n\nSubmit a query with your preferred date/time and we will connect you to the HR team.',
  car3:
    'Submit Resume:\n\nSubmit a query and mention:\n• Role/department you are applying for\n• Years of experience\n• Current location\n• Preferred date/time for a discussion\n\nOur HR team will respond soon.',
};

const curatedMainOptions = [
  { id: 'sap', text: 'SAP Services', action: 'menu' },
  { id: 'oracle', text: 'Oracle Services', action: 'menu' },
  { id: 'staffing', text: 'Managed IT services', action: 'menu' },
  { id: 'careers', text: 'Careers', action: 'menu' },
  { id: 'ticket', text: 'Submit a query', action: 'ticket' },
];

function buildCuratedMainMenu(rawMain) {
  const fallbackMessage = 'Hello! Please choose a service to continue.';
  const message =
    rawMain && typeof rawMain.message === 'string' && rawMain.message.trim()
      ? rawMain.message
      : fallbackMessage;

  const overrideTextById = (rawMain && Array.isArray(rawMain.options))
    ? rawMain.options.reduce((acc, opt) => {
      if (opt && opt.id && typeof opt.text === 'string' && opt.text.trim()) {
        acc[opt.id] = opt.text;
      }
      return acc;
    }, {})
    : {};

  const options = curatedMainOptions.map((opt) => ({
    ...opt,
    text: overrideTextById[opt.id] || opt.text,
  }));

  return { message, options };
}

export function curateMenus(rawMenus) {
  const menus = rawMenus && typeof rawMenus === 'object' ? rawMenus : {};

  return {
    ...menus,
    main: buildCuratedMainMenu(menus.main),
    sap: menus.sap,
    oracle: menus.oracle,
    staffing: menus.staffing,
    careers: menus.careers || curatedCareersMenu,
  };
}
